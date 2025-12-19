class TaskTimeoutError(Exception):
    def __init__(self, task_timeout: int):
        """Raised when a task execution takes longer than the timeout limit."""

        message = f"Task execution timed out after {task_timeout} {'second' if task_timeout == 1 else 'seconds'}"
        super().__init__(message)
        self.task_timeout = task_timeout
