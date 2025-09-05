import asyncio
import logging
import sys
from typing import Optional

from src.config.health_check_config import HealthCheckConfig
from src.config.sentry_config import SentryConfig
from src.config.task_runner_config import TaskRunnerConfig
from src.logs import setup_logging
from src.task_runner import TaskRunner


async def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    sentry = None
    sentry_config = SentryConfig.from_env()

    if sentry_config.enabled:
        from src.sentry import setup_sentry

        sentry = setup_sentry(sentry_config)

    try:
        health_check_config = HealthCheckConfig.from_env()
    except ValueError as e:
        logger.error(f"Invalid health check configuration: {e}")
        sys.exit(1)

    health_check_server: Optional["HealthCheckServer"] = None
    if health_check_config.enabled:
        from src.health_check_server import HealthCheckServer

        health_check_server = HealthCheckServer()
        try:
            await health_check_server.start(health_check_config)
        except OSError as e:
            logger.error(f"Failed to start health check server: {e}")
            sys.exit(1)

    try:
        task_runner_config = TaskRunnerConfig.from_env()
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)

    task_runner = TaskRunner(task_runner_config)
    logger.info("Starting runner...")

    try:
        await task_runner.start()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Shutting down runner...")
    except Exception:
        logger.error("Unexpected error", exc_info=True)
        raise
    finally:
        await task_runner.stop()

        if health_check_server:
            await health_check_server.stop()

        if sentry:
            sentry.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
