import asyncio
import logging
import os
import sys

os.environ["WEBSOCKETS_MAX_LOG_SIZE"] = "256"

from .constants import (
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_TASK_TIMEOUT,
    ENV_MAX_CONCURRENCY,
    ENV_MAX_PAYLOAD_SIZE,
    ENV_TASK_BROKER_URI,
    ENV_GRANT_TOKEN,
    DEFAULT_TASK_BROKER_URI,
    DEFAULT_MAX_PAYLOAD_SIZE,
    ENV_TASK_TIMEOUT,
)
from .logs import setup_logging
from .task_runner import TaskRunner, TaskRunnerOpts


async def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("Starting runner...")

    grant_token = os.getenv(ENV_GRANT_TOKEN, "")

    if not grant_token:
        logger.error(f"{ENV_GRANT_TOKEN} environment variable is required")
        sys.exit(1)

    opts = TaskRunnerOpts(
        grant_token,
        os.getenv(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI),
        int(os.getenv(ENV_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY)),
        int(os.getenv(ENV_MAX_PAYLOAD_SIZE, DEFAULT_MAX_PAYLOAD_SIZE)),
        int(os.getenv(ENV_TASK_TIMEOUT, DEFAULT_TASK_TIMEOUT)),
    )

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
