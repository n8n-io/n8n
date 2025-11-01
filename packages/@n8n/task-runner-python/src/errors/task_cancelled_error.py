class TaskCancelledError(Exception):
    """Raised when a task is cancelled by broker message, by runner shutdown, etc."""

    def __init__(self):
        super().__init__("Task was cancelled")
