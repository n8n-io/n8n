from queue import Empty
import multiprocessing
import traceback
import textwrap
import json
import os
import sys

from src.errors import (
    TaskResultMissingError,
    TaskRuntimeError,
    TaskTimeoutError,
    TaskProcessExitError,
)

from src.message_types.broker import NodeMode, Items
from src.constants import EXECUTOR_CIRCULAR_REFERENCE_KEY, EXECUTOR_USER_OUTPUT_KEY
from typing import Any, Set

from multiprocessing.context import SpawnProcess

MULTIPROCESSING_CONTEXT = multiprocessing.get_context("spawn")

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
            args=(code, items, queue, stdlib_allow, external_allow, builtins_deny),
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

            if "error" in returned:
                raise TaskRuntimeError(returned["error"])

            result = returned.get("result", [])
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
    ):
        """Execute a Python code task in all-items mode."""

        os.environ.clear()

        TaskExecutor._sanitize_sys_modules(stdlib_allow, external_allow)

        print_args: PrintArgs = []

        try:
            code = TaskExecutor._wrap_code(raw_code)

            globals = {
                "__builtins__": TaskExecutor._filter_builtins(builtins_deny),
                "_items": items,
                "print": TaskExecutor._create_custom_print(print_args),
            }

            exec(code, globals)

            queue.put(
                {"result": globals[EXECUTOR_USER_OUTPUT_KEY], "print_args": print_args}
            )

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
    ):
        """Execute a Python code task in per-item mode."""

        os.environ.clear()

        TaskExecutor._sanitize_sys_modules(stdlib_allow, external_allow)

        print_args: PrintArgs = []

        try:
            wrapped_code = TaskExecutor._wrap_code(raw_code)
            compiled_code = compile(wrapped_code, "<per_item_task_execution>", "exec")

            result = []
            for index, item in enumerate(items):
                globals = {
                    "__builtins__": TaskExecutor._filter_builtins(builtins_deny),
                    "_item": item,
                    "print": TaskExecutor._create_custom_print(print_args),
                }

                exec(compiled_code, globals)

                user_output = globals[EXECUTOR_USER_OUTPUT_KEY]

                if user_output is None:
                    continue

                user_output["pairedItem"] = {"item": index}
                result.append(user_output)

            queue.put({"result": result, "print_args": print_args})

        except Exception as e:
            TaskExecutor._put_error(queue, e, print_args)

    @staticmethod
    def _wrap_code(raw_code: str) -> str:
        indented_code = textwrap.indent(raw_code, "    ")
        return f"def _user_function():\n{indented_code}\n\n{EXECUTOR_USER_OUTPUT_KEY} = _user_function()"

    @staticmethod
    def _put_error(queue: multiprocessing.Queue, e: Exception, print_args: PrintArgs):
        queue.put(
            {
                "error": {"message": str(e), "stack": traceback.format_exc()},
                "print_args": print_args,
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
