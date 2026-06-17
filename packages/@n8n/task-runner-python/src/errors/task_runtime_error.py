from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.message_types.pipe import TaskErrorInfo


class TaskRuntimeError(Exception):
    """Raised when user code raises an exception during task execution."""

    def __init__(self, task_error_info: "TaskErrorInfo"):
        message = task_error_info["message"]
        super().__init__(message)
        self.stack_trace = task_error_info.get("stack", "")
        self.description = task_error_info.get(
            "description", ""
        ) or task_error_info.get("stderr", "")
