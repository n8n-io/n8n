from dataclasses import dataclass
from typing import List, Literal, Union, Any, Dict
from ..constants import RUNNER_RPC_CALL

from src.constants import (
    RUNNER_INFO,
    RUNNER_TASK_ACCEPTED,
    RUNNER_TASK_DONE,
    RUNNER_TASK_ERROR,
    RUNNER_TASK_OFFER,
    RUNNER_TASK_REJECTED,
)


@dataclass
class RunnerInfo:
    name: str
    types: List[str]
    type: Literal["runner:info"] = RUNNER_INFO


@dataclass
class RunnerTaskOffer:
    offer_id: str
    task_type: str
    valid_for: int
    type: Literal["runner:taskoffer"] = RUNNER_TASK_OFFER


@dataclass
class RunnerTaskAccepted:
    task_id: str
    type: Literal["runner:taskaccepted"] = RUNNER_TASK_ACCEPTED


@dataclass
class RunnerTaskRejected:
    task_id: str
    reason: str
    type: Literal["runner:taskrejected"] = RUNNER_TASK_REJECTED


@dataclass
class RunnerTaskDone:
    task_id: str
    data: Dict[str, Any]
    type: Literal["runner:taskdone"] = RUNNER_TASK_DONE


@dataclass
class RunnerTaskError:
    task_id: str
    error: Dict[str, Any]
    type: Literal["runner:taskerror"] = RUNNER_TASK_ERROR


@dataclass
class RunnerRpcCall:
    call_id: str
    task_id: str
    name: str
    params: List[Any]
    type: Literal["runner:rpc"] = RUNNER_RPC_CALL


RunnerMessage = Union[
    RunnerInfo,
    RunnerTaskOffer,
    RunnerTaskAccepted,
    RunnerTaskRejected,
    RunnerTaskDone,
    RunnerTaskError,
    RunnerRpcCall,
]
