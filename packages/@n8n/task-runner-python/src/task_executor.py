from queue import Empty
import multiprocessing
import traceback
import textwrap
import json
import os
import sys
import tempfile

from src.errors import (
    TaskResultMissingError,
    TaskRuntimeError,
    TaskTimeoutError,
    TaskProcessExitError,
)

from src.message_types.broker import NodeMode, Items
from src.constants import (
    EXECUTOR_CIRCULAR_REFERENCE_KEY,
    EXECUTOR_USER_OUTPUT_KEY,
    EXECUTOR_ALL_ITEMS_FILENAME,
    EXECUTOR_PER_ITEM_FILENAME,
)
from typing import Any, Set

from multiprocessing.context import SpawnProcess

MULTIPROCESSING_CONTEXT = multiprocessing.get_context("fork")
MAX_PRINT_ARGS_ALLOWED = 100

PrintArgs = list[list[Any]]  # Args to all `print()` calls in a Python code task


class TaskExecutor:
    """Responsible for executing Python code tasks in isolated subprocesses."""

    @staticmethod
    def create_process(
        code: str,
        node_mode: NodeMode,
        items: Items,
        stdlib_allow: Set[str],
        external_allow: Set[str],
        builtins_deny: set[str],
        can_log: bool,
    ):
        """Create a subprocess for executing a Python code task and a queue for communication."""

        fn = (
            TaskExecutor._all_items
            if node_mode == "all_items"
            else TaskExecutor._per_item
        )

        queue = MULTIPROCESSING_CONTEXT.Queue()
        process = MULTIPROCESSING_CONTEXT.Process(
            target=fn,
            args=(
                code,
                items,
                queue,
                stdlib_allow,
                external_allow,
                builtins_deny,
                can_log,
            ),
        )

        return process, queue

    @staticmethod
    def execute_process(
        process: SpawnProcess,
        queue: multiprocessing.Queue,
        task_timeout: int,
        continue_on_fail: bool,
    ) -> tuple[list, PrintArgs]:
        """Execute a subprocess for a Python code task."""

        print_args: PrintArgs = []

        try:
            process.start()
            process.join(timeout=task_timeout)

            if process.is_alive():
                TaskExecutor.stop_process(process)
                raise TaskTimeoutError(task_timeout)

            if process.exitcode != 0:
                assert process.exitcode is not None
                raise TaskProcessExitError(process.exitcode)

            try:
                returned = queue.get_nowait()
            except Empty:
                raise TaskResultMissingError()
            finally:
                queue.close()
                queue.join_thread()

            if "error" in returned:
                raise TaskRuntimeError(returned["error"])

            if "result_file" not in returned:
                raise TaskResultMissingError()

            result_file = returned["result_file"]
            try:
                with open(result_file, "r", encoding="utf-8") as f:
                    result = json.load(f)
            finally:
                os.unlink(result_file)

            print_args = returned.get("print_args", [])

            return result, print_args

        except Exception as e:
            if continue_on_fail:
                return [{"json": {"error": str(e)}}], print_args
            raise

    @staticmethod
    def stop_process(process: SpawnProcess | None):
        """Stop a running subprocess, gracefully else force-killing."""

        if process is None or not process.is_alive():
            return

        process.terminate()
        process.join(timeout=1)  # 1s grace period

        if process.is_alive():
            process.kill()

    @staticmethod
    def _all_items(
        raw_code: str,
        items: Items,
        queue: multiprocessing.Queue,
        stdlib_allow: Set[str],
        external_allow: Set[str],
        builtins_deny: set[str],
        can_log: bool,
    ):
        """Execute a Python code task in all-items mode."""

        os.environ.clear()

        TaskExecutor._sanitize_sys_modules(stdlib_allow, external_allow)

        print_args: PrintArgs = []

        try:
            wrapped_code = TaskExecutor._wrap_code(raw_code)
            compiled_code = compile(wrapped_code, EXECUTOR_ALL_ITEMS_FILENAME, "exec")

            globals = {
                "__builtins__": TaskExecutor._filter_builtins(builtins_deny),
                "_items": items,
                "print": TaskExecutor._create_custom_print(print_args)
                if can_log
                else print,
            }

            exec(compiled_code, globals)

            result = globals[EXECUTOR_USER_OUTPUT_KEY]
            TaskExecutor._put_result(queue, result, print_args)

        except Exception as e:
            TaskExecutor._put_error(queue, e, print_args)

    @staticmethod
    def _per_item(
        raw_code: str,
        items: Items,
        queue: multiprocessing.Queue,
        stdlib_allow: Set[str],
        external_allow: Set[str],
        builtins_deny: set[str],
        can_log: bool,
    ):
        """Execute a Python code task in per-item mode."""

        os.environ.clear()

        TaskExecutor._sanitize_sys_modules(stdlib_allow, external_allow)

        print_args: PrintArgs = []

        try:
            wrapped_code = TaskExecutor._wrap_code(raw_code)
            compiled_code = compile(wrapped_code, EXECUTOR_PER_ITEM_FILENAME, "exec")

            result = []
            for index, item in enumerate(items):
                globals = {
                    "__builtins__": TaskExecutor._filter_builtins(builtins_deny),
                    "_item": item,
                    "print": TaskExecutor._create_custom_print(print_args)
                    if can_log
                    else print,
                }

                exec(compiled_code, globals)

                user_output = globals[EXECUTOR_USER_OUTPUT_KEY]

                if user_output is None:
                    continue

                user_output["pairedItem"] = {"item": index}
                result.append(user_output)

            TaskExecutor._put_result(queue, result, print_args)

        except Exception as e:
            TaskExecutor._put_error(queue, e, print_args)

    @staticmethod
    def _wrap_code(raw_code: str) -> str:
        indented_code = textwrap.indent(raw_code, "    ")
        return f"def _user_function():\n{indented_code}\n\n{EXECUTOR_USER_OUTPUT_KEY} = _user_function()"

    @staticmethod
    def _put_result(
        queue: multiprocessing.Queue, result: list[Any], print_args: PrintArgs
    ):
        with tempfile.NamedTemporaryFile(
            mode="w",
            delete=False,
            prefix="n8n_result_",
            suffix=".json",
            encoding="utf-8",
        ) as f:
            json.dump(result, f, default=str, ensure_ascii=False)
            result_file = f.name

        print_args_to_send = TaskExecutor._truncate_print_args(print_args)
        queue.put({"result_file": result_file, "print_args": print_args_to_send})

    @staticmethod
    def _put_error(queue: multiprocessing.Queue, e: Exception, print_args: PrintArgs):
        print_args_to_send = TaskExecutor._truncate_print_args(print_args)
        queue.put(
            {
                "error": {"message": str(e), "stack": traceback.format_exc()},
                "print_args": print_args_to_send,
            }
        )

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
    def _filter_builtins(builtins_deny: set[str]):
        """Get __builtins__ with denied ones removed."""

        if len(builtins_deny) == 0:
            return __builtins__

        return {k: v for k, v in __builtins__.items() if k not in builtins_deny}

    @staticmethod
    def _sanitize_sys_modules(stdlib_allow: Set[str], external_allow: Set[str]):
        safe_modules = {
            "builtins",
            "__main__",
            "sys",
            "traceback",
            "linecache",
            "importlib",
            "importlib.machinery",
        }

        if "*" in stdlib_allow:
            safe_modules.update(sys.stdlib_module_names)
        else:
            safe_modules.update(stdlib_allow)

        if "*" in external_allow:
            safe_modules.update(
                name
                for name in sys.modules.keys()
                if name not in sys.stdlib_module_names
            )
        else:
            safe_modules.update(external_allow)

        modules_to_remove = [
            name for name in sys.modules.keys() if name not in safe_modules
        ]

        for module_name in modules_to_remove:
            del sys.modules[module_name]
