import asyncio
import textwrap

import aiohttp
import pytest
from src.nanoid import nanoid

from tests.integration.conftest import create_task_settings
from tests.fixtures.test_constants import HEALTH_CHECK_URL


@pytest.mark.asyncio
async def test_health_check_server_responds(broker, manager):
    async with aiohttp.ClientSession() as session:
        for _ in range(10):
            try:
                response = await session.get(HEALTH_CHECK_URL)
                if response.status == 200:
                    assert await response.text() == "OK"
                    return
            except aiohttp.ClientConnectionError:
                await asyncio.sleep(0.1)


@pytest.mark.asyncio
async def test_health_check_server_ressponds_mid_execution(broker, manager):
    task_id = nanoid()
    code = textwrap.dedent("""
        for _ in range(10_000_000):
            pass
        return [{"result": "completed"}]
    """)
    task_settings = create_task_settings(code=code, node_mode="all_items")
    await broker.send_task(task_id=task_id, task_settings=task_settings)
    await asyncio.sleep(0.3)

    async with aiohttp.ClientSession() as session:
        response = await session.get(HEALTH_CHECK_URL)
        assert response.status == 200
        assert await response.text() == "OK"
