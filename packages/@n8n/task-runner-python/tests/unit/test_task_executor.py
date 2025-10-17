import pytest
from unittest.mock import MagicMock
from queue import Empty

from src.task_executor import TaskExecutor
from src.errors import TaskCancelledError, TaskKilledError, TaskSubprocessFailedError
from src.constants import SIGTERM_EXIT_CODE, SIGKILL_EXIT_CODE


class TestTaskExecutorProcessExitHandling:
    def test_sigterm_raises_task_cancelled_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = SIGTERM_EXIT_CODE

        queue = MagicMock()

        with pytest.raises(TaskCancelledError):
            TaskExecutor.execute_process(
                process=process,
                queue=queue,
                task_timeout=60,
                continue_on_fail=False,
            )

    def test_sigkill_raises_task_killed_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = SIGKILL_EXIT_CODE

        queue = MagicMock()

        with pytest.raises(TaskKilledError):
            TaskExecutor.execute_process(
                process=process,
                queue=queue,
                task_timeout=60,
                continue_on_fail=False,
            )

    def test_other_non_zero_exit_code_raises_task_subprocess_failed_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = -1  # Some other error code

        queue = MagicMock()

        with pytest.raises(TaskSubprocessFailedError) as exc_info:
            TaskExecutor.execute_process(
                process=process,
                queue=queue,
                task_timeout=60,
                continue_on_fail=False,
            )

        assert exc_info.value.exit_code == -1

    def test_zero_exit_code_with_empty_queue_raises_task_result_missing_error(self):
        from src.errors import TaskResultMissingError

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        queue = MagicMock()
        queue.get_nowait.side_effect = Empty()

        with pytest.raises(TaskResultMissingError):
            TaskExecutor.execute_process(
                process=process,
                queue=queue,
                task_timeout=60,
                continue_on_fail=False,
            )
