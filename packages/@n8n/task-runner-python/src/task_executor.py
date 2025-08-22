from queue import Empty
import multiprocessing
import traceback
import textwrap

from .errors import (
    TaskResultMissingError,
    TaskRuntimeError,
    TaskTimeoutError,
    TaskProcessExitError,
)

from .message_types.broker import NodeMode, Items
from .constants import EXECUTOR_USER_OUTPUT_KEY

from multiprocessing.context import SpawnProcess

MULTIPROCESSING_CONTEXT = multiprocessing.get_context("spawn")


class TaskExecutor:
    """Responsible for executing Python code tasks in isolated subprocesses."""

    @staticmethod
    def create_process(code: str, node_mode: NodeMode, items: Items):
        """Create a subprocess for executing a Python code task and a queue for communication."""

        fn = (
            TaskExecutor._all_items
            if node_mode == "all_items"
            else TaskExecutor._per_item
        )

        queue = MULTIPROCESSING_CONTEXT.Queue()
        process = MULTIPROCESSING_CONTEXT.Process(target=fn, args=(code, items, queue))

        return process, queue

    @staticmethod
    def execute_process(
        process: SpawnProcess,
        queue: multiprocessing.Queue,
        task_timeout: int,
        continue_on_fail: bool,
    ):
        """Execute a subprocess for a Python code task."""

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

            return returned["result"] or []

        except Exception as e:
            if continue_on_fail:
                return [{"json": {"error": str(e)}}]
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
    def _all_items(raw_code: str, items: Items, queue: multiprocessing.Queue):
        """Execute a Python code task in all-items mode."""

        try:
            code = TaskExecutor._wrap_code(raw_code)
            globals = {"__builtins__": __builtins__, "_items": items}
            exec(code, globals)
            queue.put({"result": globals[EXECUTOR_USER_OUTPUT_KEY]})

        except Exception as e:
            TaskExecutor._put_error(queue, e)

    @staticmethod
    def _per_item(raw_code: str, items: Items, queue: multiprocessing.Queue):
        """Execute a Python code task in per-item mode."""

        try:
            wrapped_code = TaskExecutor._wrap_code(raw_code)
            compiled_code = compile(wrapped_code, "<per_item_task_execution>", "exec")

            result = []
            for index, item in enumerate(items):
                globals = {"__builtins__": __builtins__, "_item": item}
                exec(compiled_code, globals)
                user_output = globals[EXECUTOR_USER_OUTPUT_KEY]

                if user_output is None:
                    continue

                user_output["pairedItem"] = {"item": index}
                result.append(user_output)

            queue.put({"result": result})

        except Exception as e:
            TaskExecutor._put_error(queue, e)

    @staticmethod
    def _wrap_code(raw_code: str) -> str:
        indented_code = textwrap.indent(raw_code, "    ")
        return f"def _user_function():\n{indented_code}\n\n{EXECUTOR_USER_OUTPUT_KEY} = _user_function()"

    @staticmethod
    def _put_error(queue: multiprocessing.Queue, e: Exception):
        queue.put({"error": {"message": str(e), "stack": traceback.format_exc()}})
