from dataclasses import dataclass
from typing import Literal, Union, List, Dict, Any

from src.constants import (
    BROKER_INFO_REQUEST,
    BROKER_RUNNER_REGISTERED,
    BROKER_TASK_CANCEL,
    BROKER_TASK_OFFER_ACCEPT,
    BROKER_TASK_SETTINGS,
    BROKER_RPC_RESPONSE,
)


@dataclass
class BrokerInfoRequest:
    type: Literal["broker:inforequest"] = BROKER_INFO_REQUEST


@dataclass
class BrokerRunnerRegistered:
    type: Literal["broker:runnerregistered"] = BROKER_RUNNER_REGISTERED


@dataclass
class BrokerTaskOfferAccept:
    task_id: str
    offer_id: str
    type: Literal["broker:taskofferaccept"] = BROKER_TASK_OFFER_ACCEPT


NodeMode = Literal["all_items", "per_item"]

Items = List[Dict[str, Any]]  # INodeExecutionData[]


@dataclass
class TaskSettings:
    code: str
    node_mode: NodeMode
    continue_on_fail: bool
    items: Items
    workflow_name: str
    workflow_id: str
    node_name: str
    node_id: str


@dataclass
class BrokerTaskSettings:
    task_id: str
    settings: TaskSettings
    type: Literal["broker:tasksettings"] = BROKER_TASK_SETTINGS


@dataclass
class BrokerTaskCancel:
    task_id: str
    reason: str
    type: Literal["broker:taskcancel"] = BROKER_TASK_CANCEL


@dataclass
class BrokerRpcResponse:
    call_id: str
    task_id: str
    status: str
    type: Literal["broker:rpcresponse"] = BROKER_RPC_RESPONSE


BrokerMessage = Union[
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    BrokerTaskSettings,
    BrokerTaskCancel,
    BrokerRpcResponse,
]
