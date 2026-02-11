import asyncio
import logging
import sys
import platform

from n8n_task_runner.constants import ERROR_WINDOWS_NOT_SUPPORTED
from n8n_task_runner.config.health_check_config import HealthCheckConfig
from n8n_task_runner.config.sentry_config import SentryConfig
from n8n_task_runner.config.task_runner_config import TaskRunnerConfig
from n8n_task_runner.errors import ConfigurationError
from n8n_task_runner.logs import setup_logging
from n8n_task_runner.task_runner import TaskRunner
from n8n_task_runner.shutdown import Shutdown


async def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    sentry = None
    sentry_config = SentryConfig.from_env()

    if sentry_config.enabled:
        from n8n_task_runner.sentry import setup_sentry

        sentry = setup_sentry(sentry_config)

    try:
        health_check_config = HealthCheckConfig.from_env()
    except ConfigurationError as e:
        logger.error(f"Invalid health check configuration: {e}")
        sys.exit(1)

    health_check_server: "HealthCheckServer | None" = None
    if health_check_config.enabled:
        from n8n_task_runner.health_check_server import HealthCheckServer

        health_check_server = HealthCheckServer()
        try:
            await health_check_server.start(health_check_config)
        except OSError as e:
            logger.error(f"Failed to start health check server: {e}")
            sys.exit(1)

    try:
        task_runner_config = TaskRunnerConfig.from_env()
    except ConfigurationError as e:
        logger.error(str(e))
        sys.exit(1)

    task_runner = TaskRunner(task_runner_config)
    logger.info("Starting runner...")

    shutdown = Shutdown(task_runner, health_check_server, sentry)
    task_runner.on_idle_timeout = shutdown.start_auto_shutdown

    try:
        await task_runner.start()
    except Exception:
        logger.error("Unexpected error", exc_info=True)
        await shutdown.start_shutdown()

    exit_code = await shutdown.wait_for_shutdown()
    sys.exit(exit_code)


if __name__ == "__main__":
    if platform.system() == "Windows":
        print(ERROR_WINDOWS_NOT_SUPPORTED, file=sys.stderr)
        sys.exit(1)

    asyncio.run(main())
