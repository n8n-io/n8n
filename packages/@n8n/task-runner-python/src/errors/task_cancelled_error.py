class TaskCancelledError(Exception):
    """Raised when a task is cancelled by the broker."""

    def __init__(self):
        super().__init__("Task was cancelled")
