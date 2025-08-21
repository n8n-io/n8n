class TaskResultMissingError(Exception):
    """Raised when a task subprocess exits successfully but returns no result.

    This typically indicates an internal error where the subprocess did not
    put any data in the communication queue.
    """

    def __init__(self):
        super().__init__(
            "Process completed but returned no result. This is likely an internal error."
        )
