import asyncio
import textwrap
import time

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import create_task_settings


@pytest.mark.asyncio
async def test_graceful_shutdown(broker, manager):
    task_id = nanoid()

    code = textwrap.dedent("""
        import time
        time.sleep(30)
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)
    await asyncio.sleep(0.5)

    start = time.time()
    await manager.stop()
    elapsed = time.time() - start

    # Shutdown should complete within a reasonable time (not wait 30s)
    assert elapsed < 5.0, (
        f"Shutdown took {elapsed:.2f}s - task wasn't terminated properly"
    )
