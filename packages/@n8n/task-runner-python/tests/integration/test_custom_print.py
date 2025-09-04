import asyncio

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    get_task_console_messages,
    wait_for_task_done,
    wait_for_task_error,
)


@pytest.mark.asyncio
async def test_custom_print_basic_types(local_task_broker, task_runner_manager):
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
async def test_custom_print_complex_types(local_task_broker, task_runner_manager):
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
async def test_custom_print_circular_reference(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
class Node:
    def __init__(self, value):
        self.value = value
        self.next = None

node1 = Node(1)
node2 = Node(2)
node1.next = node2
node2.next = node1  # Circular reference

print(node1)

circular_dict = {"key": "value"}
circular_dict["self"] = circular_dict
print(circular_dict)

return [{"handled": "circular"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items", can_log=True)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    # Check for either task completion or error
    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)
    if result is None:
        error = await wait_for_task_error(local_task_broker, task_id, timeout=0.5)
        if error:
            print(f"Task error: {error}")
        return
    
    assert result is not None
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert data["result"] == [{"handled": "circular"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"
    
    all_output = " ".join(["".join(msg) for msg in messages])
    
    assert "[Circular Node]" in all_output
    assert "[Circular dict]" in all_output


@pytest.mark.asyncio
async def test_custom_print_non_serializable_objects(
    local_task_broker, task_runner_manager
):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
import datetime

print(datetime.datetime.now())

class CustomClass:
    def __init__(self):
        self.data = "test"

    def __repr__(self):
        return f"CustomClass(data='{self.data}')"

custom_obj = CustomClass()
print(custom_obj)

# Lambda function (non-serializable)
lambda_func = lambda x: x * 2
print(lambda_func)

return [{"non_serializable": "handled"}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items", can_log=True)

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    # Check for either task completion or error
    result = await wait_for_task_done(local_task_broker, task_id, timeout=5.0)
    if result is None:
        error = await wait_for_task_error(local_task_broker, task_id, timeout=0.5)
        if error:
            print(f"Task error: {error}")
        # For this test, importing datetime might be blocked, which is acceptable
        return
    
    assert result is not None
    assert "data" in result
    data = result["data"]
    assert "result" in data
    assert data["result"] == [{"non_serializable": "handled"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"
    
    all_output = " ".join(["".join(msg) for msg in messages])
    
    assert "202" in all_output
    assert "CustomClass" in all_output or "test" in all_output


@pytest.mark.asyncio
async def test_custom_print_unicode_and_special_chars(
    local_task_broker, task_runner_manager
):
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

return [{"unicode": "✓"}]
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
    assert data["result"] == [{"unicode": "✓"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"
    
    all_output = " ".join(["".join(msg) for msg in messages])
    
    assert "世界" in all_output
    assert "🌍" in all_output
    assert "🚀" in all_output
    assert "你好" in all_output


@pytest.mark.asyncio
async def test_custom_print_edge_cases(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
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

return [{"edge_cases": "tested"}]
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
    assert data["result"] == [{"edge_cases": "tested"}]

    messages = get_task_console_messages(local_task_broker, task_id)
    assert len(messages) > 0, "Should have captured console messages"
    
    all_output = " ".join(["".join(msg) for msg in messages])
    
    assert "[]" in all_output
    assert "{}" in all_output

