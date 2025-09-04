import asyncio

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    get_task_console_messages,
    wait_for_task_done,
)


@pytest.mark.asyncio
async def test_print_basic_types(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
print("Hello, World!")
print(42)
print(3.14)
print(True)
print(None)
print("Multiple", "args", 123, False)
return [{"printed": "ok"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items", can_log=True)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)
    assert result is not None
    assert result["taskId"] == task_id
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert data["result"] == [{"printed": "ok"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"

    all_args = []
    for msg in messages:
        all_args.extend(msg)

    assert "'Hello, World!'" in all_args
    assert "42" in all_args
    assert "3.14" in all_args
    assert "True" in all_args
    assert "None" in all_args

    assert "'Multiple'" in all_args
    assert "'args'" in all_args
    assert "123" in all_args
    assert "False" in all_args


@pytest.mark.asyncio
async def test_print_complex_types(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
# Dictionary
print({"name": "John", "age": 30, "active": True})

# List
print([1, 2, "three", {"four": 4}])

# Nested structure
print({"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]})

return [{"result": "success"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items", can_log=True)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)
    assert result is not None
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert data["result"] == [{"result": "success"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"

    all_output = " ".join(["".join(msg) for msg in messages])

    assert '{"name":"John","age":30,"active":true}' in all_output.replace(" ", "")
    assert '[1,2,"three",{"four":4}]' in all_output.replace(" ", "")


@pytest.mark.asyncio
async def test_print_edge_cases(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
# Unicode characters
print("Hello 世界 🌍")
print({"emoji": "🚀", "chinese": "你好", "arabic": "مرحبا"})

# Special characters
print("Line\\nbreak")
print("Tab\\tseparated")
print('Quote "test" here')

# Empty print
print()

# Empty string
print("")

# Just spaces
print("   ")

# Empty collections
print([])
print({})
print(())

# Very long string
long_string = "x" * 1000
print(long_string)

return [{"test": "complete"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items", can_log=True)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)
    assert result is not None
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert data["result"] == [{"test": "complete"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"

    all_output = " ".join(["".join(msg) for msg in messages])

    # Unicode assertions
    assert "世界" in all_output
    assert "🌍" in all_output
    assert "🚀" in all_output
    assert "你好" in all_output

    # Edge case assertions
    assert "[]" in all_output
    assert "{}" in all_output
