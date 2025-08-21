class TaskResultMissingError(Exception):
    def __init__(self):
        super().__init__("Process completed but returned no result")
