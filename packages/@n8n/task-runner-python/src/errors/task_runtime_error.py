from typing import Any


class TaskRuntimeError(Exception):
    """Raised when user code throws an exception during task execution."""

    def __init__(self, error_dict: dict[str, Any]):
        message = error_dict["message"]
        super().__init__(message)
        self.stack_trace = error_dict.get("stack", "")
        self.description = error_dict.get("description", "") or error_dict.get(
            "stderr", ""
        )
