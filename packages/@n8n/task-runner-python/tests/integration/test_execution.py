import asyncio
import textwrap

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
async def test_all_items_with_success(broker, manager):
    task_id = nanoid()
    items = [
        {"json": {"name": "Alice", "age": 30}},
        {"json": {"name": "Bob", "age": 16}},
        {"json": {"name": "Charlie", "age": 35}},
    ]
    code = textwrap.dedent("""
        result = []
        for item in _items:
            person = item['json']
            result.append({
                'name': person['name'],
                'age': person['age'],
                'adult': person['age'] >= 18
            })
        return result
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items", items=items)
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    result = await wait_for_task_done(broker, task_id)

    assert result["data"]["result"] == [
        {"name": "Alice", "age": 30, "adult": True},
        {"name": "Bob", "age": 16, "adult": False},
        {"name": "Charlie", "age": 35, "adult": True},
    ]


@pytest.mark.asyncio
async def test_all_items_with_error(broker, manager):
    task_id = nanoid()
    code = "raise ValueError('Intentional error')"
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    error_msg = await wait_for_task_error(broker, task_id)

    assert error_msg["taskId"] == task_id
    assert "Intentional error" in str(error_msg["error"]["message"])


@pytest.mark.asyncio
async def test_all_items_with_continue_on_fail(broker, manager):
    task_id = nanoid()
    code = "raise ValueError('Intentional error')"
    task_settings = create_task_settings(
        code=code, node_mode="all_items", continue_on_fail=True
    )
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    done_msg = await wait_for_task_done(broker, task_id)

    assert len(done_msg["data"]["result"]) == 1
    assert "error" in done_msg["data"]["result"][0]["json"]
    assert "Intentional error" in str(done_msg["data"]["result"][0]["json"]["error"])


# ========== per_item mode ==========


@pytest.mark.asyncio
async def test_per_item_with_success(broker, manager):
    task_id = nanoid()
    items = [
        {"json": {"value": 10}},
        {"json": {"value": 20}},
        {"json": {"value": 30}},
    ]
    code = "return {'doubled': _item['json']['value'] * 2}"
    task_settings = create_task_settings(code=code, node_mode="per_item", items=items)
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    done_msg = await wait_for_task_done(broker, task_id)

    assert done_msg["taskId"] == task_id
    assert done_msg["data"]["result"] == [
        {"doubled": 20, "pairedItem": {"item": 0}},
        {"doubled": 40, "pairedItem": {"item": 1}},
        {"doubled": 60, "pairedItem": {"item": 2}},
    ]


@pytest.mark.asyncio
async def test_per_item_with_filtering(broker, manager):
    task_id = nanoid()
    items = [
        {"json": {"value": 5}},
        {"json": {"value": 15}},
        {"json": {"value": 25}},
        {"json": {"value": 8}},
    ]
    code = textwrap.dedent("""
        value = _item['json']['value']
        if value > 10:
            return {'value': value, 'passed': True}
        else:
            return None  # Filter out this item
    """)
    task_settings = create_task_settings(code=code, node_mode="per_item", items=items)
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    result = await wait_for_task_done(broker, task_id)

    assert result["data"]["result"] == [
        {"value": 15, "passed": True, "pairedItem": {"item": 1}},
        {"value": 25, "passed": True, "pairedItem": {"item": 2}},
    ]


@pytest.mark.asyncio
async def test_per_item_with_continue_on_fail(broker, manager):
    task_id = nanoid()
    items = [
        {"json": {"value": 10}},
        {"json": {"value": 0}},  # Will cause division by zero
        {"json": {"value": 20}},
    ]
    code = "return {'result': 100 / _item['json']['value']}"
    task_settings = create_task_settings(
        code=code,
        node_mode="per_item",
        items=items,
        continue_on_fail=True,
    )
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    done_msg = await wait_for_task_done(broker, task_id)

    assert len(done_msg["data"]["result"]) == 1
    assert "error" in done_msg["data"]["result"][0]["json"]
    assert "division by zero" in done_msg["data"]["result"][0]["json"]["error"]


# ========== Security ===========


@pytest.mark.asyncio
async def test_cannot_access_builtins_via_globals(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        b = globals()['__builtins__']
        imp = b['__import__']
        os = imp('os')
        return [{"json": {"pid": os.getpid()}}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    error_msg = await wait_for_task_error(broker, task_id)

    assert error_msg["taskId"] == task_id
    assert "globals" in str(error_msg["error"]["message"]).lower()


@pytest.mark.asyncio
async def test_cannot_access_builtins_via_locals(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        b = locals()['__builtins__']
        imp = b['__import__']
        os = imp('os')
        return [{"json": {"pid": os.getpid()}}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    error_msg = await wait_for_task_error(broker, task_id)

    assert error_msg["taskId"] == task_id
    assert "locals" in str(error_msg["error"]["message"]).lower()


# ========== edge cases ===========


@pytest.mark.asyncio
async def test_cancel_during_execution(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        import time
        for i in range(20):
            time.sleep(0.05)
            if i == 10:
                # Should be cancelled around here
                pass
        return [{"completed": "should not reach here"}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)
    await asyncio.sleep(0.3)
    await broker.cancel_task(task_id, reason="Cancelled during execution")

    error_msg = await wait_for_task_error(broker, task_id)

    assert error_msg["taskId"] == task_id
    assert "error" in error_msg


@pytest.mark.asyncio
async def test_timeout_during_execution(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        while True:
            pass
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    error_msg = await wait_for_task_error(broker, task_id, timeout=TASK_TIMEOUT + 1.5)

    assert error_msg["taskId"] == task_id
    assert "timed out" in error_msg["error"]["message"].lower()


@pytest.mark.asyncio
async def test_stdlib_submodules_with_wildcard(broker, manager_with_stdlib_wildcard):
    task_id = nanoid()
    code = textwrap.dedent("""
        from collections.abc import Iterable
        result = isinstance([1, 2, 3], Iterable)
        return [{"json": {"is_iterable": result}}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    result = await wait_for_task_done(broker, task_id)

    assert result["data"]["result"] == [{"json": {"is_iterable": True}}]


@pytest.mark.asyncio
async def test_cannot_bypass_import_restrictions_via_builtins_dict(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        os = __builtins__['__import__']('os')
        print(os.getpid())
        return []
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    error_msg = await wait_for_task_error(broker, task_id)

    assert error_msg["taskId"] == task_id
    assert "error" in error_msg
    assert "os" in str(error_msg["error"]["description"]).lower()
