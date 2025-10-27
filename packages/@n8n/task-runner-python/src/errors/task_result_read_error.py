class TaskResultReadError(Exception):
    """Raised when the parent process fails to read result from the child process.

    This typically indicates a communication failure such as the pipe closing
    prematurely, JSON decode errors, or other IPC failures.
    """

    def __init__(self):
        super().__init__("Failed to read result from child process")
