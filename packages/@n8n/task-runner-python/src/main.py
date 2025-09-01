import asyncio
import logging
import sys
from typing import Optional

from src.env import parse_env_vars
from src.logs import setup_logging
from src.task_runner import TaskRunner


async def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("Starting runner...")

    try:
        task_runner_opts, health_check_opts = parse_env_vars()
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)

    task_runner = TaskRunner(task_runner_opts)
    health_check_server: Optional["HealthCheckServer"] = None

    if health_check_opts.enabled:
        from src.health import HealthCheckServer

        health_check_server = HealthCheckServer()
        try:
            await health_check_server.start(
                health_check_opts.host, health_check_opts.port
            )
        except OSError as e:
            logger.error(f"Failed to start health check server: {e}")
            sys.exit(1)

    try:
        await task_runner.start()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Shutting down runner...")
    finally:
        await task_runner.stop()

        if health_check_server:
            await health_check_server.stop()


if __name__ == "__main__":
    asyncio.run(main())
