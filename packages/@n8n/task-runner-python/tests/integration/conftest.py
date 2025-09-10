import pytest_asyncio
from src.message_types.broker import Items
from src.message_serde import NODE_MODE_MAP

from tests.fixtures.local_task_broker import LocalTaskBroker
from tests.fixtures.task_runner_manager import TaskRunnerManager
from tests.fixtures.test_constants import (
    TASK_RESPONSE_WAIT,
)

NODE_MODE_TO_BROKER_STYLE = {v: k for k, v in NODE_MODE_MAP.items()}


@pytest_asyncio.fixture
async def manager():
    manager = TaskRunnerManager()
    await manager.start()
    yield manager
    await manager.stop()


@pytest_asyncio.fixture
async def broker():
    broker = LocalTaskBroker()
    await broker.start()
    yield broker
    await broker.stop()


def create_task_settings(
    code: str,
    node_mode: str,
    items: Items | None = None,
    continue_on_fail: bool = False,
    can_log: bool = False,
):
    return {
        "code": code,
        "nodeMode": NODE_MODE_TO_BROKER_STYLE[node_mode],
        "items": items if items is not None else [],
        "continueOnFail": continue_on_fail,
        "canLog": can_log,
    }


async def wait_for_task_done(broker, task_id: str, timeout: float = TASK_RESPONSE_WAIT):
    return await broker.wait_for_msg(
        "runner:taskdone",
        timeout=timeout,
        predicate=lambda msg: msg.get("taskId") == task_id,
    )


async def wait_for_task_error(
    broker, task_id: str, timeout: float = TASK_RESPONSE_WAIT
):
    return await broker.wait_for_msg(
        "runner:taskerror",
        timeout=timeout,
        predicate=lambda msg: msg.get("taskId") == task_id,
    )


def get_browser_console_msgs(broker: LocalTaskBroker, task_id: str) -> list[list[str]]:
    console_msgs = []
    for msg in broker.get_task_rpc_messages(task_id):
        if msg.get("method") == "logNodeOutput":
            console_msgs.append(msg.get("params", []))
    return console_msgs
