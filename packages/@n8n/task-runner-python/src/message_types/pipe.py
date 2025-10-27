from typing import Any, TypedDict

from src.message_types.broker import Items

PrintArgs = list[list[Any]]


class TaskErrorInfo(TypedDict):
    message: str
    description: str
    stack: str
    stderr: str


class PipeResultMessage(TypedDict):
    result: Items
    print_args: PrintArgs


class PipeErrorMessage(TypedDict):
    error: TaskErrorInfo
    print_args: PrintArgs


PipeMessage = PipeResultMessage | PipeErrorMessage
