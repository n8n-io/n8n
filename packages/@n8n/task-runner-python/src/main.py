import asyncio
import logging
import os
import sys

from .task_runner import TaskRunner

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


async def main():
    task_broker_uri = os.getenv("N8N_RUNNERS_TASK_BROKER_URI", "http://127.0.0.1:5679")
    grant_token = os.getenv("N8N_RUNNERS_GRANT_TOKEN", "")

    if not grant_token:
        logger.error("N8N_RUNNERS_GRANT_TOKEN environment variable is required")
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
