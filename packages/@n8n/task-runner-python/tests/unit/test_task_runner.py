import pytest
from unittest.mock import MagicMock, patch

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
            pipe_reader_timeout=3.0,
        )

    @pytest.mark.asyncio
    async def test_connection_failure_logs_warning_not_crash(self, config):
        runner = TaskRunner(config)

        with patch("src.task_runner.websockets.connect") as mock_connect, patch.object(
            runner, "logger"
        ) as mock_logger:

            mock_connect.side_effect = ConnectionRefusedError("Connection refused")

            counter = 0

            def mock_shutdown():
                nonlocal counter
                counter += 1
                return counter > 1

            type(runner).is_shutting_down = property(lambda self: mock_shutdown())

            await runner.start()

            mock_logger.warning.assert_called_once()
            args = mock_logger.warning.call_args[0][0]
            assert "Failed to connect to broker" in args
