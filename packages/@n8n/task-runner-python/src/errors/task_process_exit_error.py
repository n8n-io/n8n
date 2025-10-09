class TaskProcessExitError(Exception):
    """Raised when a task subprocess exits with a non-zero exit code."""

    def __init__(self, exit_code: int):
        super().__init__(f"Process exited with code {exit_code}")
        self.exit_code = exit_code
