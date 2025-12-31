import asyncio
import logging
import os
import sys

from .constants import ENV_TASK_BROKER_URI, ENV_GRANT_TOKEN, DEFAULT_TASK_BROKER_URI
from .task_runner import TaskRunner

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


async def main():
    task_broker_uri = os.getenv(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI)
    grant_token = os.getenv(ENV_GRANT_TOKEN, "")

    if not grant_token:
        logger.error(f"{ENV_GRANT_TOKEN} environment variable is required")
        sys.exit(1)

    runner = TaskRunner(
        task_broker_uri=task_broker_uri,
        grant_token=grant_token,
    )

    try:
        await runner.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await runner.stop()


if __name__ == "__main__":
    asyncio.run(main())
