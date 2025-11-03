import pytest
import json
from unittest.mock import MagicMock, patch

from src.task_executor import TaskExecutor
from src.errors import TaskCancelledError, TaskKilledError, TaskSubprocessFailedError
from src.constants import SIGTERM_EXIT_CODE, SIGKILL_EXIT_CODE, PIPE_MSG_PREFIX_LENGTH
from src.message_types.pipe import (
    PipeResultMessage,
    PipeErrorMessage,
    TaskErrorInfo,
)


class TestTaskExecutorProcessExitHandling:
    def test_sigterm_raises_task_cancelled_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = SIGTERM_EXIT_CODE

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskCancelledError):
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

    def test_sigkill_raises_task_killed_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = SIGKILL_EXIT_CODE

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskKilledError):
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

    def test_other_non_zero_exit_code_raises_task_subprocess_failed_error(self):
        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = -1  # Some other error code

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskSubprocessFailedError) as exc_info:
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

        assert exc_info.value.exit_code == -1

    def test_zero_exit_code_with_empty_pipe_raises_task_result_read_error(self):
        from src.errors import TaskResultReadError

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskResultReadError):
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )


class TestTaskExecutorPipeCommunication:
    @patch("os.read")
    def test_successful_result_communication(self, mock_os_read):
        result_data: PipeResultMessage = {
            "result": [{"json": {"foo": "bar"}}],
            "print_args": [],
        }
        result_json = json.dumps(result_data).encode("utf-8")
        result_length = len(result_json).to_bytes(PIPE_MSG_PREFIX_LENGTH, "big")

        mock_os_read.side_effect = [result_length, result_json]

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        result, print_args, size = TaskExecutor.execute_process(
            process=process,
            read_conn=read_conn,
            write_conn=write_conn,
            task_timeout=60,
            pipe_reader_timeout=3.0,
            continue_on_fail=False,
        )

        assert result == [{"json": {"foo": "bar"}}]
        assert print_args == []
        assert size == len(result_json)

    @patch("os.read")
    def test_successful_error_communication(self, mock_os_read):
        from src.errors import TaskRuntimeError

        error_info: TaskErrorInfo = {
            "message": "Test error",
            "description": "",
            "stack": "traceback...",
            "stderr": "",
        }
        error_data: PipeErrorMessage = {
            "error": error_info,
            "print_args": [],
        }
        error_json = json.dumps(error_data).encode("utf-8")
        error_length = len(error_json).to_bytes(PIPE_MSG_PREFIX_LENGTH, "big")

        mock_os_read.side_effect = [error_length, error_json]

        process = MagicMock()
        process.is_alive.return_value = False
        process.exitcode = 0

        read_conn = MagicMock()
        write_conn = MagicMock()
        read_conn.fileno.return_value = 999

        with pytest.raises(TaskRuntimeError) as exc_info:
            TaskExecutor.execute_process(
                process=process,
                read_conn=read_conn,
                write_conn=write_conn,
                task_timeout=60,
                pipe_reader_timeout=3.0,
                continue_on_fail=False,
            )

        assert str(exc_info.value) == "Test error"
        assert exc_info.value.stack_trace == "traceback..."


class TestTaskExecutorLowLevelIO:
    @patch("os.read")
    def test_read_exact_bytes_single_read(self, mock_os_read):
        data = b"test data"
        mock_os_read.return_value = data

        result = TaskExecutor._read_exact_bytes(999, len(data))

        assert result == data
        mock_os_read.assert_called_once_with(999, len(data))

    @patch("os.read")
    def test_read_exact_bytes_multiple_reads(self, mock_os_read):
        mock_os_read.side_effect = [b"test", b" ", b"data"]

        result = TaskExecutor._read_exact_bytes(999, 9)

        assert result == b"test data"
        assert mock_os_read.call_count == 3

    @patch("os.read")
    def test_read_exact_bytes_eof_error(self, mock_os_read):
        mock_os_read.side_effect = [b"test", b""]  # empty for EOF

        with pytest.raises(EOFError, match="Pipe closed before reading all data"):
            TaskExecutor._read_exact_bytes(999, 10)

    @patch("os.write")
    def test_write_bytes_write_failure(self, mock_os_write):
        mock_os_write.return_value = 0

        with pytest.raises(OSError, match="Write failed"):
            TaskExecutor._write_bytes(999, b"test data")
