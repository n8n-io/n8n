class TaskResultReadError(Exception):
    def __init__(self, original_error: Exception | None = None):
        super().__init__("Failed to read result from child process")
        self.original_error = original_error
