class TaskKilledError(Exception):
    """Raised when a task process is forcefully killed (SIGKILL).

    This usually indicates:
    - Out of memory (OOM killer)
    - Process exceeded resource limits
    - Manual operator intervention
    """

    def __init__(self):
        super().__init__("Process was forcefully killed (SIGKILL)")
