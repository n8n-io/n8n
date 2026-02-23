import json
import os
import threading
from typing import cast

from multiprocessing.connection import Connection

from src.errors import (
    InvalidPipeMsgContentError,
    InvalidPipeMsgLengthError,
)
from src.message_types.pipe import PipeMessage
from src.constants import PIPE_MSG_PREFIX_LENGTH

type PipeConnection = Connection


class PipeReader(threading.Thread):
    """Background thread that reads result from pipe."""

    def __init__(self, read_fd: int, read_conn: PipeConnection):
        super().__init__()
        self.read_fd = read_fd
        self.read_conn = read_conn
        self.pipe_message: PipeMessage | None = None
        self.message_size: int | None = None  # bytes
        self.error: Exception | None = None

    def run(self):
        try:
            length_bytes = PipeReader._read_exact_bytes(
                self.read_fd, PIPE_MSG_PREFIX_LENGTH
            )
            length_int = int.from_bytes(length_bytes, "big")
            if length_int <= 0:
                raise InvalidPipeMsgLengthError(length_int)
            self.message_size = length_int
            data = PipeReader._read_exact_bytes(self.read_fd, length_int)
            parsed_msg = json.loads(data.decode("utf-8"))
            self.pipe_message = self._validate_pipe_message(parsed_msg)
        except Exception as e:
            self.error = e
        finally:
            self.read_conn.close()

    @staticmethod
    def _read_exact_bytes(fd: int, n: int) -> bytes:
        """Read exactly n bytes from file descriptor.

        Uses os.read() instead of Connection.recv() because recv() pickles.
        Preallocates bytearray to avoid repeated reallocation.
        """
        result = bytearray(n)
        offset = 0
        while offset < n:
            chunk = os.read(fd, n - offset)
            if not chunk:
                raise EOFError("Pipe closed before reading all data")
            result[offset : offset + len(chunk)] = chunk
            offset += len(chunk)
        return bytes(result)

    def _validate_pipe_message(self, msg) -> PipeMessage:
        if not isinstance(msg, dict):
            raise InvalidPipeMsgContentError(f"Expected dict, got {type(msg).__name__}")

        if "print_args" not in msg:
            raise InvalidPipeMsgContentError("Message missing 'print_args' key")

        if not isinstance(msg["print_args"], list):
            raise InvalidPipeMsgContentError("'print_args' must be a list")

        has_result = "result" in msg
        has_error = "error" in msg

        if not has_result and not has_error:
            raise InvalidPipeMsgContentError("Msg is missing 'result' or 'error' key")

        if has_result and has_error:
            raise InvalidPipeMsgContentError("Msg has both 'result' and 'error' keys")

        if has_error and not isinstance(msg["error"], dict):
            raise InvalidPipeMsgContentError("'error' must be a dict")

        return cast(PipeMessage, msg)
