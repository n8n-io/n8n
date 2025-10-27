import multiprocessing
import traceback
import textwrap
import json
import io
import os
import sys
import logging
import threading

from src.errors import (
    TaskCancelledError,
    TaskKilledError,
    TaskResultMissingError,
    TaskRuntimeError,
    TaskTimeoutError,
    TaskSubprocessFailedError,
    SecurityViolationError,
)
from src.import_validation import validate_module_import
from src.config.security_config import SecurityConfig

from src.message_types.broker import NodeMode, Items
from src.constants import (
    EXECUTOR_CIRCULAR_REFERENCE_KEY,
    EXECUTOR_USER_OUTPUT_KEY,
    EXECUTOR_ALL_ITEMS_FILENAME,
    EXECUTOR_PER_ITEM_FILENAME,
    SIGTERM_EXIT_CODE,
    SIGKILL_EXIT_CODE,
)
from typing import Any

from multiprocessing.context import ForkServerProcess

logger = logging.getLogger(__name__)

MULTIPROCESSING_CONTEXT = multiprocessing.get_context("forkserver")
MAX_PRINT_ARGS_ALLOWED = 100

PrintArgs = list[list[Any]]  # Args to all `print()` calls in a Python code task


class TaskExecutor:
    """Responsible for executing Python code tasks in isolated subprocesses."""

    @staticmethod
    def create_process(
        code: str,
        node_mode: NodeMode,
        items: Items,
        security_config: SecurityConfig,
    ):
        """Create a subprocess for executing a Python code task and a pipe for communication."""

        fn = (
            TaskExecutor._all_items
            if node_mode == "all_items"
            else TaskExecutor._per_item
        )

        read_conn, write_conn = MULTIPROCESSING_CONTEXT.Pipe(duplex=False)

        process = MULTIPROCESSING_CONTEXT.Process(
            target=fn,
            args=(
                code,
                items,
                write_conn,
                security_config,
            ),
        )

        return process, read_conn, write_conn

    @staticmethod
    def execute_process(
        process: ForkServerProcess,
        read_conn,
        write_conn,
        task_timeout: int,
        continue_on_fail: bool,
    ) -> tuple[list, PrintArgs, int]:
        """Execute a subprocess for a Python code task."""

        print_args: PrintArgs = []

        try:
            read_fd = read_conn.fileno()

            result_data: list[dict] = []
            read_error: list[Exception] = []

            def read_from_pipe():
                """Read result from pipe in background thread."""

                try:
                    length_bytes = TaskExecutor._read_exact(read_fd, 4)
                    length = int.from_bytes(length_bytes, "big")

                    data = TaskExecutor._read_exact(read_fd, length)
                    returned = json.loads(data.decode("utf-8"))
                    result_data.append(returned)
                except Exception as e:
                    read_error.append(e)
                finally:
                    read_conn.close()

            reader = threading.Thread(target=read_from_pipe, daemon=True)
            reader.start()

            try:
                process.start()
                write_conn.close()
            except (ProcessLookupError, ConnectionError, BrokenPipeError) as e:
                logger.error(f"Failed to start child process: {e}")
                write_conn.close()
                raise TaskSubprocessFailedError(-1)

            process.join(timeout=task_timeout)

            if process.is_alive():
                TaskExecutor.stop_process(process)
                raise TaskTimeoutError(task_timeout)

            if process.exitcode == SIGTERM_EXIT_CODE:
                raise TaskCancelledError()

            if process.exitcode == SIGKILL_EXIT_CODE:
                raise TaskKilledError()

            if process.exitcode != 0:
                assert process.exitcode is not None
                raise TaskSubprocessFailedError(process.exitcode)

            reader.join(timeout=5.0)

            if read_error:
                logger.error(
                    f"Failed to retrieve results from child process: {read_error[0]}"
                )
                raise TaskResultMissingError()

            if not result_data:
                raise TaskResultMissingError()

            returned = result_data[0]

            if "error" in returned:
                raise TaskRuntimeError(returned["error"])

            if "result" not in returned:
                raise TaskResultMissingError()

            result = returned["result"]
            print_args = returned.get("print_args", [])
            message_length = len(
                json.dumps(returned, default=str, ensure_ascii=False).encode("utf-8")
            )

            return result, print_args, message_length

        except Exception as e:
            if continue_on_fail:
                return [{"json": {"error": str(e)}}], print_args, 0
            raise

    @staticmethod
    def stop_process(process: ForkServerProcess | None):
        """Stop a running subprocess, gracefully else force-killing."""

        if process is None or not process.is_alive():
            return

        try:
            process.terminate()
            process.join(timeout=1)  # 1s grace period

            if process.is_alive():
                process.kill()
                process.join()
        except (ProcessLookupError, ConnectionError, BrokenPipeError):
            # subprocess is dead or unreachable
            pass

    @staticmethod
    def _all_items(
        raw_code: str,
        items: Items,
        write_conn,
        security_config: SecurityConfig,
    ):
        """Execute a Python code task in all-items mode."""

        if security_config.runner_env_deny:
            os.environ.clear()

        TaskExecutor._sanitize_sys_modules(security_config)

        print_args: PrintArgs = []
        sys.stderr = stderr_capture = io.StringIO()

        try:
            wrapped_code = TaskExecutor._wrap_code(raw_code)
            compiled_code = compile(wrapped_code, EXECUTOR_ALL_ITEMS_FILENAME, "exec")

            globals = {
                "__builtins__": TaskExecutor._filter_builtins(security_config),
                "_items": items,
                "print": TaskExecutor._create_custom_print(print_args),
            }

            exec(compiled_code, globals)

            result = globals[EXECUTOR_USER_OUTPUT_KEY]
            write_fd = write_conn.fileno()
            TaskExecutor._put_result(write_fd, result, print_args)

        except BaseException as e:
            write_fd = write_conn.fileno()
            TaskExecutor._put_error(write_fd, e, stderr_capture.getvalue(), print_args)

    @staticmethod
    def _per_item(
        raw_code: str,
        items: Items,
        write_conn,
        security_config: SecurityConfig,
    ):
        """Execute a Python code task in per-item mode."""

        if security_config.runner_env_deny:
            os.environ.clear()

        TaskExecutor._sanitize_sys_modules(security_config)

        print_args: PrintArgs = []
        sys.stderr = stderr_capture = io.StringIO()

        try:
            wrapped_code = TaskExecutor._wrap_code(raw_code)
            compiled_code = compile(wrapped_code, EXECUTOR_PER_ITEM_FILENAME, "exec")

            filtered_builtins = TaskExecutor._filter_builtins(security_config)
            custom_print = TaskExecutor._create_custom_print(print_args)

            result = []
            for index, item in enumerate(items):
                globals = {
                    "__builtins__": filtered_builtins,
                    "_item": item,
                    "print": custom_print,
                }

                exec(compiled_code, globals)

                user_output = globals[EXECUTOR_USER_OUTPUT_KEY]

                if user_output is None:
                    continue

                json_data = TaskExecutor._extract_json_data_per_item(user_output)

                item = {"json": json_data, "pairedItem": {"item": index}}

                if isinstance(user_output, dict) and "binary" in user_output:
                    item["binary"] = user_output["binary"]

                result.append(item)

            write_fd = write_conn.fileno()
            TaskExecutor._put_result(write_fd, result, print_args)

        except BaseException as e:
            write_fd = write_conn.fileno()
            TaskExecutor._put_error(write_fd, e, stderr_capture.getvalue(), print_args)

    @staticmethod
    def _wrap_code(raw_code: str) -> str:
        indented_code = textwrap.indent(raw_code, "    ")
        return f"def _user_function():\n{indented_code}\n\n{EXECUTOR_USER_OUTPUT_KEY} = _user_function()"

    @staticmethod
    def _extract_json_data_per_item(user_output):
        if not isinstance(user_output, dict):
            return user_output

        if "json" in user_output:
            return user_output["json"]

        if "binary" in user_output:
            return {k: v for k, v in user_output.items() if k != "binary"}

        return user_output

    @staticmethod
    def _put_result(write_fd: int, result: list[Any], print_args: PrintArgs):
        print_args_to_send = TaskExecutor._truncate_print_args(print_args)

        message = {
            "result": result,
            "print_args": print_args_to_send,
        }

        data = json.dumps(message, default=str, ensure_ascii=False).encode("utf-8")
        length_bytes = len(data).to_bytes(4, "big")

        TaskExecutor._write_all(write_fd, length_bytes)
        TaskExecutor._write_all(write_fd, data)
        os.close(write_fd)

    @staticmethod
    def _put_error(
        write_fd: int,
        e: BaseException,
        stderr: str = "",
        print_args: PrintArgs = [],
    ):
        error_dict = {
            "message": f"Process exited with code {e.code}"
            if isinstance(e, SystemExit)
            else str(e),
            "description": getattr(e, "description", ""),
            "stack": traceback.format_exc(),
            "stderr": stderr,
        }

        print_args_to_send = TaskExecutor._truncate_print_args(print_args)

        message = {
            "error": error_dict,
            "print_args": print_args_to_send,
        }

        data = json.dumps(message, default=str, ensure_ascii=False).encode("utf-8")
        length_bytes = len(data).to_bytes(4, "big")

        TaskExecutor._write_all(write_fd, length_bytes)
        TaskExecutor._write_all(write_fd, data)
        os.close(write_fd)

    # ========== print() ==========

    @staticmethod
    def _create_custom_print(print_args: PrintArgs):
        def custom_print(*args):
            serializable_args = []

            for arg in args:
                try:
                    json.dumps(arg, default=str, ensure_ascii=False)
                    serializable_args.append(arg)
                except Exception as _:
                    # Ensure args are serializable so they are transmissible
                    # through the multiprocessing queue and via websockets.
                    serializable_args.append(
                        {
                            EXECUTOR_CIRCULAR_REFERENCE_KEY: repr(arg),
                            "__type__": type(arg).__name__,
                        }
                    )

            formatted = TaskExecutor._format_print_args(*serializable_args)
            print_args.append(formatted)
            print("[user code]", *args)

        return custom_print

    @staticmethod
    def _format_print_args(*args) -> list[str]:
        """
        Takes the args passed to a `print()` call in user code and converts them
        to string representations suitable for display in a browser console.

        Expects all args to be serializable.
        """

        formatted = []

        for arg in args:
            if isinstance(arg, str):
                formatted.append(f"'{arg}'")

            elif arg is None or isinstance(arg, (int, float, bool)):
                formatted.append(str(arg))

            elif isinstance(arg, dict) and EXECUTOR_CIRCULAR_REFERENCE_KEY in arg:
                formatted.append(f"[Circular {arg.get('__type__', 'Object')}]")

            else:
                formatted.append(json.dumps(arg, default=str, ensure_ascii=False))

        return formatted

    @staticmethod
    def _truncate_print_args(print_args: PrintArgs) -> PrintArgs:
        """Truncate print_args to prevent pipe buffer overflow."""

        if not print_args or len(print_args) <= MAX_PRINT_ARGS_ALLOWED:
            return print_args

        truncated = print_args[:MAX_PRINT_ARGS_ALLOWED]
        truncated.append(
            [
                f"[Output truncated - {len(print_args) - MAX_PRINT_ARGS_ALLOWED} more print statements]"
            ]
        )

        return truncated

    # ========== security ==========

    @staticmethod
    def _filter_builtins(security_config: SecurityConfig):
        """Get __builtins__ with denied ones removed."""

        if len(security_config.builtins_deny) == 0:
            filtered = dict(__builtins__)
        else:
            filtered = {
                k: v
                for k, v in __builtins__.items()
                if k not in security_config.builtins_deny
            }

        filtered["__import__"] = TaskExecutor._create_safe_import(security_config)

        return filtered

    @staticmethod
    def _sanitize_sys_modules(security_config: SecurityConfig):
        safe_modules = {
            "builtins",
            "__main__",
            "sys",
            "traceback",
            "linecache",
            "importlib",
            "importlib.machinery",
        }

        if "*" in security_config.stdlib_allow:
            safe_modules.update(sys.stdlib_module_names)
        else:
            safe_modules.update(security_config.stdlib_allow)

        if "*" in security_config.external_allow:
            safe_modules.update(
                name
                for name in sys.modules.keys()
                if name not in sys.stdlib_module_names
            )
        else:
            safe_modules.update(security_config.external_allow)

        # keep modules marked as safe and submodules of those
        safe_prefixes = [safe + "." for safe in safe_modules]
        modules_to_remove = [
            name
            for name in sys.modules.keys()
            if name not in safe_modules
            and not any(name.startswith(prefix) for prefix in safe_prefixes)
        ]

        for module_name in modules_to_remove:
            del sys.modules[module_name]

    @staticmethod
    def _create_safe_import(security_config: SecurityConfig):
        original_import = __builtins__["__import__"]

        def safe_import(name, *args, **kwargs):
            is_allowed, error_msg = validate_module_import(name, security_config)

            if not is_allowed:
                assert error_msg is not None
                raise SecurityViolationError(
                    message="Security violation detected",
                    description=error_msg,
                )

            return original_import(name, *args, **kwargs)

        return safe_import

    @staticmethod
    def _read_exact(fd: int, n: int) -> bytes:
        """Read exactly n bytes from file descriptor."""

        result = b""
        while len(result) < n:
            chunk = os.read(fd, n - len(result))
            if not chunk:
                raise EOFError("Pipe closed before reading all data")
            result += chunk
        return result

    @staticmethod
    def _write_all(fd: int, data: bytes):
        """Write all bytes to file descriptor."""

        total_written = 0
        while total_written < len(data):
            written = os.write(fd, data[total_written:])
            if written == 0:
                raise OSError("Write failed")
            total_written += written
