import multiprocessing
import logging
import traceback
import textwrap

from .errors import TaskExecutionError, TaskTimeoutError
from .message_types.broker import NodeMode, Items


class TaskExecutor:
    """Responsible for executing Python code tasks in isolated subprocesses."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    @staticmethod
    def create_process(code: str, node_mode: NodeMode, items: Items):
        """Create a subprocess for executing a Python code task and a queue for communication."""

        fn = (
            TaskExecutor._all_items
            if node_mode == "all_items"
            else TaskExecutor._per_item
        )

        queue = multiprocessing.Queue()
        process = multiprocessing.Process(target=fn, args=(code, items, queue))

        return process, queue

    @staticmethod
    def execute_process(
        process: multiprocessing.Process,
        queue: multiprocessing.Queue,
        task_timeout: int,
        continue_on_fail: bool = False,
    ):
        """Execute a subprocess for a Python code task."""

        try:
            process.start()
            process.join(timeout=task_timeout)

            if process.is_alive():
                TaskExecutor.stop_process(process)
                raise TaskTimeoutError(task_timeout)

            returned = queue.get()

            if "error" in returned:
                raise TaskExecutionError(returned["error"])

            return returned["result"] or []

        except Exception as e:
            if continue_on_fail:
                return [{"json": {"error": str(e)}}]
            raise

    @staticmethod
    def stop_process(process: multiprocessing.Process | None):
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
            # TODO: Passing twice?
            namespace = {"__builtins__": __builtins__, "_items": items}
            exec(code, namespace, namespace)
            queue.put({"result": namespace["user_output"]})

        except Exception as e:
            TaskExecutor._put_error(queue, e)

    @staticmethod
    def _per_item(raw_code: str, items: Items, queue: multiprocessing.Queue):
        """Execute a Python code task in per-item mode."""

        try:
            result = []
            for index, item in enumerate(items):
                code = TaskExecutor._wrap_code(raw_code)
                # TODO: Passing twice?
                namespace = {"__builtins__": __builtins__, "_item": item}
                exec(code, namespace, namespace)
                user_output = namespace["user_output"]

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
        return (
            f"def _user_function():\n{indented_code}\n\nuser_output = _user_function()"
        )

    @staticmethod
    def _put_error(queue: multiprocessing.Queue, e: Exception):
        queue.put({"error": {"message": str(e), "stack": traceback.format_exc()}})
