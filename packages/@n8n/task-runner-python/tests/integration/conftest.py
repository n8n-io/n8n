import asyncio

import pytest_asyncio
from src.message_types.broker import Items

from tests.fixtures.local_task_broker import LocalTaskBroker
from tests.fixtures.task_runner_manager import TaskRunnerManager
from tests.fixtures.test_constants import (
    CONNECTION_WAIT,
    TASK_RESPONSE_WAIT,
)


@pytest_asyncio.fixture
async def task_runner_manager():
    manager = TaskRunnerManager()
    await manager.start()
    await asyncio.sleep(CONNECTION_WAIT)
    yield manager
    await manager.stop()


@pytest_asyncio.fixture
async def local_task_broker():
    broker = LocalTaskBroker()
    await broker.start()
    yield broker
    await broker.stop()


def create_task_settings(
    code: str,
    node_mode: str,
    items: Items | None = None,
    continue_on_fail: bool = False,
):
    mode_mapping = {
        "all_items": "runOnceForAllItems",
        "per_item": "runOnceForEachItem",
    }

    return {
        "code": code,
        "nodeMode": mode_mapping[node_mode],
        "items": items or [],
        "continueOnFail": continue_on_fail,
    }


async def wait_for_task_done(
    local_task_broker, task_id: str, timeout: float = TASK_RESPONSE_WAIT
):
    return await local_task_broker.wait_for_message(
        "runner:taskdone",
        timeout=timeout,
        predicate=lambda msg: msg.get("taskId") == task_id,
    )


async def wait_for_task_error(
    local_task_broker, task_id: str, timeout: float = TASK_RESPONSE_WAIT
):
    return await local_task_broker.wait_for_message(
        "runner:taskerror",
        timeout=timeout,
        predicate=lambda msg: msg.get("taskId") == task_id,
    )
