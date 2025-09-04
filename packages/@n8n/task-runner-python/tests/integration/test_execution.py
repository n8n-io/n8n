import asyncio

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    wait_for_task_done,
    wait_for_task_error,
)
from tests.fixtures.test_constants import TASK_TIMEOUT


# ========== all_items mode ==========


@pytest.mark.asyncio
async def test_all_items_passthrough(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    task_settings = create_task_settings(
        code='return [{"result": "success"}]',
        node_mode="all_items",
        items=[
            {"json": {"value": 1}},
            {"json": {"value": 2}},
            {"json": {"value": 3}},
        ],
    )

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)
    assert result is not None
    assert result["taskId"] == task_id
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert len(data["result"]) == 1
    assert data["result"][0] == {"result": "success"}


@pytest.mark.asyncio
async def test_all_items_with_input_processing(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    items = [
        {"json": {"name": "Alice", "age": 30}},
        {"json": {"name": "Bob", "age": 25}},
        {"json": {"name": "Charlie", "age": 35}},
    ]

    code = """
result = []
for item in _items:
    person = item['json']
    result.append({
        'name': person['name'],
        'age': person['age'],
        'adult': person['age'] >= 18
    })
return result
"""

    task_settings = create_task_settings(code=code, node_mode="all_items", items=items)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)

    assert result is not None
    data = result["data"]
    assert "result" in data
    output = data["result"]
    assert len(output) == 3
    assert output[0]["name"] == "Alice"
    assert output[0]["adult"] is True
    assert output[1]["name"] == "Bob"
    assert output[1]["adult"] is True
    assert output[2]["name"] == "Charlie"
    assert output[2]["adult"] is True


@pytest.mark.asyncio
async def test_all_items_with_error(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
raise ValueError("Test error")
"""

    task_settings = create_task_settings(
        code=code, node_mode="all_items", continue_on_fail=True
    )

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)

    assert result is not None
    assert result["taskId"] == task_id
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert len(data["result"]) == 1
    assert "json" in data["result"][0]
    assert "error" in data["result"][0]["json"]
    assert "Test error" in str(data["result"][0]["json"]["error"])


@pytest.mark.asyncio
async def test_all_items_continue_on_fail(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
if True:
    raise ValueError("Intentional error")
return [{"should": "not reach here"}]
"""

    task_settings = create_task_settings(
        code=code, node_mode="all_items", continue_on_fail=True
    )

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)

    assert result is not None
    data = result["data"]
    assert "result" in data
    assert len(data["result"]) == 1
    assert "json" in data["result"][0]
    assert "error" in data["result"][0]["json"]
    assert "Intentional error" in str(data["result"][0]["json"]["error"])

    # ========== per_item mode ==========


@pytest.mark.asyncio
async def test_per_item_passthrough(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    items = [
        {"json": {"value": 10}},
        {"json": {"value": 20}},
        {"json": {"value": 30}},
    ]

    code = """
value = _item['json']['value']
return {'doubled': value * 2}
"""

    task_settings = create_task_settings(code=code, node_mode="per_item", items=items)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)

    assert result is not None
    assert result["taskId"] == task_id
    assert "data" in result
    data = result["data"]
    assert "result" in data
    output = data["result"]
    assert len(output) == 3
    assert output[0]["doubled"] == 20
    assert output[1]["doubled"] == 40
    assert output[2]["doubled"] == 60

    # TODO: Verify pairedItem when implemented
    # assert 'pairedItem' in output[0]
    # assert 'pairedItem' in output[1]
    # assert 'pairedItem' in output[2]


@pytest.mark.asyncio
async def test_per_item_with_filtering(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    items = [
        {"json": {"value": 5}},
        {"json": {"value": 15}},
        {"json": {"value": 25}},
        {"json": {"value": 8}},
    ]

    code = """
value = _item['json']['value']
if value > 10:
    return {'value': value, 'passed': True}
else:
    return None  # Filter out this item
"""

    task_settings = create_task_settings(code=code, node_mode="per_item", items=items)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)

    assert result is not None
    data = result["data"]
    output = data["result"]
    assert len(output) == 2
    assert output[0]["value"] == 15
    assert output[0]["passed"] is True
    assert output[1]["value"] == 25
    assert output[1]["passed"] is True


@pytest.mark.asyncio
async def test_per_item_continue_on_fail(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    items = [
        {"json": {"value": 10}},
        {"json": {"value": 0}},  # Will cause division by zero
        {"json": {"value": 20}},
    ]

    code = """
value = _item['json']['value']
result = 100 / value
return {'result': result}
"""

    task_settings = create_task_settings(
        code=code,
        node_mode="per_item",
        items=items,
        continue_on_fail=True,
    )

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)

    assert result is not None
    data = result["data"]
    output = data["result"]
    assert len(output) == 1
    assert "error" in output[0]["json"]
    assert "division by zero" in output[0]["json"]["error"]


# ========== edge cases (cancel & timeout) ===========


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

    await local_task_broker.cancel_task(task_id, reason="Cancelled before execution")

    local_task_broker.task_settings[task_id] = task_settings

    await asyncio.sleep(0.3)

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

    await asyncio.sleep(0.1)

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

    result = await wait_for_task_done(local_task_broker, task_id, timeout=1.0)
    assert result is not None
    assert result["taskId"] == task_id

    await local_task_broker.cancel_task(task_id, reason="Too late")

    await asyncio.sleep(0.1)

    assert task_runner_manager.is_running()  # No issues

    done_messages = local_task_broker.get_messages_of_type("runner:taskdone")
    task_done = [msg for msg in done_messages if msg.get("taskId") == task_id]
    assert len(task_done) == 1
    assert task_done[0]["data"]["result"][0]["result"] == "quick completion"


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
