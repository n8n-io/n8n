import asyncio

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    wait_for_task_done,
)


@pytest.mark.asyncio
async def test_per_item_simple_execution(local_task_broker, task_runner_manager):
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
