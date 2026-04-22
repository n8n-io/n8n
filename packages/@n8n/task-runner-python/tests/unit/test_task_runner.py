import asyncio

import pytest
from unittest.mock import patch, Mock

from websockets.exceptions import InvalidStatus

from src.task_runner import TaskRunner
from src.config.task_runner_config import TaskRunnerConfig


class TestTaskRunnerConnectionRetry:
    @pytest.fixture
    def config(self):
        return TaskRunnerConfig(
            grant_token="test-token",
            task_broker_uri="http://127.0.0.1:5679",
            max_concurrency=5,
            max_payload_size=1024 * 1024,
            task_timeout=60,
            auto_shutdown_timeout=0,
            graceful_shutdown_timeout=10,
            stdlib_allow={"*"},
            external_allow={"*"},
            builtins_deny=set(),
            env_deny=False,
        )

    @pytest.mark.asyncio
    async def test_connection_failure_logs_warning_not_crash(self, config):
        runner = TaskRunner(config)

        def connection_side_effect(*args, **kwargs):
            if mock_connect.call_count >= 2:
                runner.is_shutting_down = True
            raise ConnectionRefusedError("Connection refused")

        with (
            patch("src.task_runner.websockets.connect") as mock_connect,
            patch.object(runner, "logger") as mock_logger,
            patch("src.task_runner.asyncio.sleep"),
        ):
            mock_connect.side_effect = connection_side_effect

            await runner.start()

            assert mock_connect.call_count >= 2
            mock_logger.warning.assert_called()
            args = mock_logger.warning.call_args[0][0]
            assert "Failed to connect to broker" in args

    @pytest.mark.asyncio
    async def test_auth_failure_raises_without_retry(self, config):
        runner = TaskRunner(config)

        with (
            patch("src.task_runner.websockets.connect") as mock_connect,
            patch.object(runner, "logger") as mock_logger,
        ):
            mock_response = Mock()
            mock_response.status_code = 403
            auth_error = InvalidStatus(mock_response)
            mock_connect.side_effect = auth_error

            with pytest.raises(InvalidStatus):
                await runner.start()

            mock_logger.error.assert_called_once()
            args = mock_logger.error.call_args[0][0]
            assert "Authentication failed with status 403" in args

            assert mock_connect.call_count == 1


class TestTaskRunnerDrain:
    @pytest.fixture
    def config(self):
        return TaskRunnerConfig(
            grant_token="test-token",
            task_broker_uri="http://127.0.0.1:5679",
            max_concurrency=5,
            max_payload_size=1024 * 1024,
            task_timeout=60,
            auto_shutdown_timeout=0,
            graceful_shutdown_timeout=10,
            stdlib_allow={"*"},
            external_allow={"*"},
            builtins_deny=set(),
            env_deny=False,
        )

    @pytest.mark.asyncio
    async def test_drain_stops_sending_offers(self, config):
        runner = TaskRunner(config)
        runner.can_send_offers = True

        async def wait_forever():
            await asyncio.sleep(1000)

        runner.offers_coroutine = asyncio.create_task(wait_forever())

        await runner._handle_drain()

        assert runner.can_send_offers is False
        assert runner.offers_coroutine.cancelled()
