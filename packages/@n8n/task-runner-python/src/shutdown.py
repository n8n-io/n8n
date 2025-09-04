import asyncio
import logging
import signal
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from src.task_runner import TaskRunner
    from src.health_check_server import HealthCheckServer
    from src.sentry import TaskRunnerSentry


class Shutdown:
    """Responsible for managing the shutdown routine of the task runner."""

    def __init__(
        self,
        task_runner: "TaskRunner",
        health_check_server: Optional["HealthCheckServer"] = None,
        sentry: Optional["TaskRunnerSentry"] = None,
    ):
        self.logger = logging.getLogger(__name__)
        self.is_shutting_down = False
        self.shutdown_complete = asyncio.Event()
        self.exit_code = 0

        self.task_runner = task_runner
        self.health_check_server = health_check_server
        self.sentry = sentry

        self._register_handler(signal.SIGINT)
        self._register_handler(signal.SIGTERM)

    async def start_shutdown(self, custom_timeout: Optional[int] = None):
        if self.is_shutting_down:
            return

        self.is_shutting_down = True

        timeout = (
            custom_timeout
            if custom_timeout is not None
            else self.task_runner.config.graceful_shutdown_timeout
        )

        try:
            await asyncio.wait_for(self._perform_shutdown(), timeout=timeout)
            self.exit_code = 0
        except asyncio.TimeoutError:
            self.logger.warning(f"Shutdown timed out after {timeout}s, forcing exit...")
            self.exit_code = 1
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}", exc_info=True)
            self.exit_code = 1
        finally:
            self.shutdown_complete.set()

    async def wait_for_shutdown(self) -> int:
        await self.shutdown_complete.wait()
        return self.exit_code

    def _register_handler(self, sig: signal.Signals):
        async def handler():
            self.logger.info(f"Received {sig.name} signal, starting shutdown...")
            await self.start_shutdown()

        try:
            asyncio.get_running_loop().add_signal_handler(
                sig, lambda: asyncio.create_task(handler())
            )
        except NotImplementedError:
            self.logger.warning(
                f"Signal handler for {sig.name} not supported on this platform"
            )  # e.g. Windows

    async def start_auto_shutdown(self):
        self.logger.info("Reached idle timeout, starting shutdown...")
        await self.start_shutdown(3)  # no tasks so no grace period

    async def _perform_shutdown(self):
        await self.task_runner.stop()

        if self.health_check_server:
            await self.health_check_server.stop()

        if self.sentry:
            self.sentry.shutdown()
