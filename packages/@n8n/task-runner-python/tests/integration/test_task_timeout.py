import asyncio

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    wait_for_task_error,
)
from tests.fixtures.test_constants import TASK_TIMEOUT


@pytest.mark.asyncio
async def test_timeout_interrupts_long_running_task(
    local_task_broker, task_runner_manager
):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
counter = 0
while True:
    counter += 1
    if counter > 1000000000:
        counter = 0
return [{"should": "not complete"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items")

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    error = await wait_for_task_error(
        local_task_broker, task_id, timeout=TASK_TIMEOUT + 0.5
    )

    assert error is not None
    assert error["taskId"] == task_id
    assert "error" in error
    error_message = error["error"]["message"].lower()
    assert (
        "timeout" in error_message
        or "timed out" in error_message
        or "execution time" in error_message
    )
    assert task_runner_manager.is_running()  # No issues
