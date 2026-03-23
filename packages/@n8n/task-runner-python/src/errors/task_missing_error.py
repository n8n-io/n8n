class TaskMissingError(Exception):
    """Raised when attempting to operate on a task that does not exist.

    This typically indicates an internal error where the task runner
    received a message referencing a task ID that is not currently
    being tracked in the runner's running tasks.
    """

    def __init__(self, task_id: str):
        super().__init__(
            f"Failed to find task {task_id}. This is likely an internal error."
        )
