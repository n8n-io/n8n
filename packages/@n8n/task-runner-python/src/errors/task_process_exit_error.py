class TaskProcessExitError(Exception):
    def __init__(self, exit_code: int):
        super().__init__(f"Process exited with code {exit_code}")
        self.exit_code = exit_code
