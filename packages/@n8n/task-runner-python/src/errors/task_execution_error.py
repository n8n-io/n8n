from typing import Dict, Any


class TaskExecutionError(Exception):
    def __init__(self, error_dict: Dict[str, Any]):
        message = error_dict["message"]
        super().__init__(message)
        self.stack_trace = error_dict.get("stack", "")
