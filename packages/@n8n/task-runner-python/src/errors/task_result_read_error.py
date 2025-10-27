class TaskResultReadError(Exception):
    def __init__(self):
        super().__init__("Failed to read result from child process")
