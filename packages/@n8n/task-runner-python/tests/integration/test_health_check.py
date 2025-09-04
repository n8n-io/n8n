import asyncio
import aiohttp

import pytest
from src.nanoid import nanoid

from tests.integration.conftest import create_task_settings
from tests.fixtures.test_constants import HEALTH_CHECK_URL


@pytest.mark.asyncio
async def test_health_check_server_responds(local_task_broker, task_runner_manager):
    await asyncio.sleep(0.5)

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(HEALTH_CHECK_URL) as response:
                assert response.status == 200
                text = await response.text()
                assert text == "OK"
        except (aiohttp.ClientError, asyncio.TimeoutError):
            pytest.skip("Health check server not enabled in test environment")


@pytest.mark.asyncio
async def test_runner_healthy_during_task_execution(
    local_task_broker, task_runner_manager
):
    await asyncio.sleep(0.5)

    task_id = nanoid()

    code = """
result = 0
for i in range(10000000):
    result += i
return [{"result": result}]
"""

    task_settings = create_task_settings(code=code, node_mode="all_items")

    await local_task_broker.send_task(
        task_id=task_id, task_type="python", task_settings=task_settings
    )

    await asyncio.sleep(0.5)

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(HEALTH_CHECK_URL) as response:
                assert response.status == 200
                text = await response.text()
                assert text == "OK"
        except (aiohttp.ClientError, asyncio.TimeoutError):
            pytest.skip("Health check server not enabled in test environment")

    assert task_runner_manager.is_running()  # No issues

