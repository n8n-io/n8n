class NoIdleTimeoutHandlerError(Exception):
    """Raised when idle timeout is reached but no shutdown handler is configured."""

    def __init__(self, timeout: int):
        super().__init__(
            f"Idle timeout is configured ({timeout}s) but no handler is set. "
            "Set task_runner.on_idle_timeout before calling task_runner.start(). "
            "This is an internal error."
        )
