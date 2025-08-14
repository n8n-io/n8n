from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Union

# ========== broker ==========


@dataclass
class BrokerInfoRequest:
    type: Literal["broker:inforequest"] = "broker:inforequest"


@dataclass
class BrokerRunnerRegistered:
    type: Literal["broker:runnerregistered"] = "broker:runnerregistered"


@dataclass
class BrokerTaskOfferAccept:
    type: Literal["broker:taskofferaccept"] = "broker:taskofferaccept"
    task_id: str
    offer_id: str


@dataclass
class BrokerTaskCancel:
    type: Literal["broker:taskcancel"] = "broker:taskcancel"
    task_id: str
    reason: str


@dataclass
class BrokerTaskSettings:
    type: Literal["broker:tasksettings"] = "broker:tasksettings"
    task_id: str
    settings: Any


BrokerMessage = Union[
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    BrokerTaskCancel,
    BrokerTaskSettings,
]

# ========== runner ==========


@dataclass
class RunnerInfo:
    type: Literal["runner:info"] = "runner:info"
    name: str
    types: List[str]


@dataclass
class RunnerTaskOffer:
    type: Literal["runner:taskoffer"] = "runner:taskoffer"
    offer_id: str
    task_type: str
    valid_for: int


@dataclass
class RunnerTaskAccepted:
    type: Literal["runner:taskaccepted"] = "runner:taskaccepted"
    task_id: str


@dataclass
class RunnerTaskRejected:
    type: Literal["runner:taskrejected"] = "runner:taskrejected"
    task_id: str
    reason: str


@dataclass
class RunnerTaskDone:
    type: Literal["runner:taskdone"] = "runner:taskdone"
    task_id: str
    data: Dict[str, Any]


@dataclass
class RunnerTaskError:
    type: Literal["runner:taskerror"] = "runner:taskerror"
    task_id: str
    error: Any


RunnerMessage = Union[
    RunnerInfo,
    RunnerTaskOffer,
    RunnerTaskAccepted,
    RunnerTaskRejected,
    RunnerTaskDone,
    RunnerTaskError,
]
