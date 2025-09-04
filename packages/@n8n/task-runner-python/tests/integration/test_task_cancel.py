import asyncio

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    wait_for_task_done,
    wait_for_task_error,
)


@pytest.mark.asyncio
async def test_cancel_before_execution(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    task_settings = create_task_settings(
        code='return [{"should": "not execute"}]', node_mode="all_items"
    )

    await local_task_broker.send_task(
        task_id=task_id,
        task_type="python",
        task_settings=None,  # We do not send settings yet
    )

    await asyncio.sleep(0.2)
    await local_task_broker.cancel_task(task_id, reason="Cancelled before execution")

    local_task_broker.task_settings[task_id] = task_settings

    await asyncio.sleep(1.0)

    done_messages = local_task_broker.get_messages_of_type("runner:taskdone")
    error_messages = local_task_broker.get_messages_of_type("runner:taskerror")

    assert not any(msg.get("taskId") == task_id for msg in done_messages)
    assert not any(msg.get("taskId") == task_id for msg in error_messages)


@pytest.mark.asyncio
async def test_cancel_during_execution(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
import time
for i in range(20):
    time.sleep(0.05)
    if i == 10:
        # Should be cancelled around here
        pass
return [{"completed": "should not reach here"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items")

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    await asyncio.sleep(0.3)

    await local_task_broker.cancel_task(task_id, reason="Cancelled during execution")

    error_msg = await wait_for_task_error(local_task_broker, task_id, timeout=1.5)

    if error_msg:
        assert error_msg["taskId"] == task_id
        assert "error" in error_msg
    else:
        done_messages = local_task_broker.get_messages_of_type("runner:taskdone")
        assert not any(msg.get("taskId") == task_id for msg in done_messages)


@pytest.mark.asyncio
async def test_cancel_non_existent_task(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    fake_task_id = nanoid()

    await local_task_broker.cancel_task(fake_task_id, reason="Cancel non-existent")

    await asyncio.sleep(1.0)

    assert task_runner_manager.is_running()  # No issues


@pytest.mark.asyncio
async def test_cancel_already_completed_task(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = 'return [{"result": "quick completion"}]'

    settings = create_task_settings(code=code, node_mode="all_items")

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=3.0)
    assert result is not None
    assert result["taskId"] == task_id

    await local_task_broker.cancel_task(task_id, reason="Too late")

    await asyncio.sleep(1.0)

    assert task_runner_manager.is_running()  # No issues

    done_messages = local_task_broker.get_messages_of_type("runner:taskdone")
    task_done = [msg for msg in done_messages if msg.get("taskId") == task_id]
    assert len(task_done) == 1
    assert task_done[0]["data"]["result"][0]["result"] == "quick completion"
