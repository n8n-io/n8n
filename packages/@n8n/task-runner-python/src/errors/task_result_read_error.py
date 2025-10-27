class TaskResultReadError(Exception):
    """Raised when the parent process fails to read result from the child process."""

    def __init__(self):
        super().__init__("Failed to read result from child process")
