from dataclasses import dataclass
from typing import List, Literal, Union


@dataclass
class RunnerInfo:
    name: str
    types: List[str]
    type: Literal["runner:info"] = "runner:info"


@dataclass
class RunnerTaskOffer:
    offer_id: str
    task_type: str
    valid_for: int
    type: Literal["runner:taskoffer"] = "runner:taskoffer"


@dataclass
class RunnerTaskAccepted:
    task_id: str
    type: Literal["runner:taskaccepted"] = "runner:taskaccepted"


@dataclass
class RunnerTaskRejected:
    task_id: str
    reason: str
    type: Literal["runner:taskrejected"] = "runner:taskrejected"


RunnerMessage = Union[
    RunnerInfo,
    RunnerTaskOffer,
    RunnerTaskAccepted,
    RunnerTaskRejected,
]
