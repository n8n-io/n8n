import textwrap

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import (
    create_task_settings,
    get_browser_console_msgs,
    wait_for_task_done,
)


@pytest.mark.asyncio
async def test_print_basic_types(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        print("Hello, World!")
        print(42)
        print(3.14)
        print(True)
        print(None)
        print("Multiple", "args", 123, False)
        return [{"printed": "ok"}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    done_msg = await wait_for_task_done(broker, task_id, timeout=5.0)

    assert done_msg["taskId"] == task_id
    assert done_msg["data"]["result"] == [{"printed": "ok"}]

    msgs = get_browser_console_msgs(broker, task_id)

    assert len(msgs) > 0, "Should have captured console messages"

    all_args = []
    for msg in msgs:
        all_args.extend(msg)

    expected = [
        "'Hello, World!'",
        "42",
        "3.14",
        "True",
        "None",
        "'Multiple'",
        "'args'",
        "123",
        "False",
    ]
    for item in expected:
        assert item in all_args, f"Expected '{item}' not found in console output"


@pytest.mark.asyncio
async def test_print_complex_types(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        print({"name": "John", "age": 30, "active": True})
        print([1, 2, "three", {"four": 4}])
        print({"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]})
        return [{"result": "success"}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)

    result_msg = await wait_for_task_done(broker, task_id, timeout=5.0)

    assert result_msg["data"]["result"] == [{"result": "success"}]

    msgs = get_browser_console_msgs(broker, task_id)
    assert len(msgs) > 0, "Should have captured console messages"

    all_output = " ".join(["".join(msg) for msg in msgs]).replace(" ", "")
    expected = [
        '{"name":"John","age":30,"active":true}',
        '[1,2,"three",{"four":4}]',
    ]
    for item in expected:
        assert item in all_output, f"Expected '{item}' not found in console output"


@pytest.mark.asyncio
async def test_print_edge_cases(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        print("Hello 世界 🌍")
        print({"emoji": "🚀", "chinese": "你好", "arabic": "مرحبا"})
        print("Line\\nbreak")
        print("Tab\\tseparated")
        print('Quote "test" here')
        print()
        print("")
        print("   ")
        print([])
        print({})
        print(())
        print("x" * 1_000)
        return [{"test": "complete"}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")

    await broker.send_task(task_id=task_id, task_settings=task_settings)

    done_msg = await wait_for_task_done(broker, task_id, timeout=5.0)

    assert done_msg["data"]["result"] == [{"test": "complete"}]

    msgs = get_browser_console_msgs(broker, task_id)
    assert len(msgs) > 0, "Should have captured console messages"

    all_output = " ".join(["".join(msg) for msg in msgs])
    expected = ["世界", "🌍", "🚀", "你好", "[]", "{}"]
    for item in expected:
        assert item in all_output, f"Expected '{item}' not found in console output"
