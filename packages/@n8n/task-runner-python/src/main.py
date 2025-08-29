import asyncio
import logging
import sys

from src.env import parse_env_vars
from src.logs import setup_logging
from src.task_runner import TaskRunner


async def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("Starting runner...")

    try:
        opts = parse_env_vars()
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)

    task_runner = TaskRunner(opts)

    try:
        await task_runner.start()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Shutting down runner...")
    finally:
        await task_runner.stop()
        logger.info("Runner stopped")


if __name__ == "__main__":
    asyncio.run(main())
