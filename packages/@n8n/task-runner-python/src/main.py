import asyncio
import logging
import os
import sys

os.environ["WEBSOCKETS_MAX_LOG_SIZE"] = "256"

from src.constants import (
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_TASK_TIMEOUT,
    ENV_MAX_CONCURRENCY,
    ENV_MAX_PAYLOAD_SIZE,
    ENV_TASK_BROKER_URI,
    ENV_GRANT_TOKEN,
    DEFAULT_TASK_BROKER_URI,
    DEFAULT_MAX_PAYLOAD_SIZE,
    ENV_TASK_TIMEOUT,
    ENV_BUILTINS_DENY,
)
from src.logs import setup_logging
from src.task_runner import TaskRunner, TaskRunnerOpts

def _parse_env_vars() -> TaskRunnerOpts:
    grant_token = os.getenv(ENV_GRANT_TOKEN, "")
    
    if not grant_token:
        raise ValueError(f"{ENV_GRANT_TOKEN} environment variable is required")
    
    denied_builtins_str = os.getenv(ENV_BUILTINS_DENY, "")
    denied_builtins = set(
        name.strip() for name in denied_builtins_str.split(",") if name.strip()
    )
    
    return TaskRunnerOpts(
        grant_token,
        os.getenv(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI),
        int(os.getenv(ENV_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY)),
        int(os.getenv(ENV_MAX_PAYLOAD_SIZE, DEFAULT_MAX_PAYLOAD_SIZE)),
        int(os.getenv(ENV_TASK_TIMEOUT, DEFAULT_TASK_TIMEOUT)),
        denied_builtins,
    )

async def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("Starting runner...")

    try:
        opts = _parse_env_vars()
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
