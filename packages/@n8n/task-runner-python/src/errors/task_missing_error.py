class TaskMissingError(Exception):
    def __init__(self, task_id: str):
        super().__init__(
            f"Failed to find task {task_id}. This is likely an internal error."
        )
