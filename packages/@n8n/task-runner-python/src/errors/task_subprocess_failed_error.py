class TaskSubprocessFailedError(Exception):
    """Raised when a task subprocess exits with a non-zero exit code, excluding SIGTERM and SIGKILL."""

    def __init__(self, exit_code: int, original_error: Exception | None = None):
        super().__init__(f"Task subprocess exited with code {exit_code}")
        self.exit_code = exit_code
        self.original_error = original_error
