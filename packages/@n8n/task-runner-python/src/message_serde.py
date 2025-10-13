import json
from dataclasses import asdict
from typing import cast

from src.message_types.broker import NodeMode, TaskSettings
from src.constants import (
    BROKER_INFO_REQUEST,
    BROKER_RUNNER_REGISTERED,
    BROKER_TASK_CANCEL,
    BROKER_TASK_OFFER_ACCEPT,
    BROKER_TASK_SETTINGS,
    BROKER_RPC_RESPONSE,
)
from src.message_types import (
    BrokerMessage,
    RunnerMessage,
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    BrokerTaskSettings,
    BrokerTaskCancel,
    BrokerRpcResponse,
)


NODE_MODE_MAP = {
    "runOnceForAllItems": "all_items",
    "runOnceForEachItem": "per_item",
}


def _get_node_mode(node_mode_str: str) -> NodeMode:
    if node_mode_str not in NODE_MODE_MAP:
        raise ValueError(f"Unknown nodeMode: {node_mode_str}")
    return cast(NodeMode, NODE_MODE_MAP[node_mode_str])


def _parse_task_settings(d: dict) -> BrokerTaskSettings:
    try:
        # required
        task_id = d["taskId"]
        settings_dict = d["settings"]
        code = settings_dict["code"]
        node_mode = _get_node_mode(settings_dict["nodeMode"])
        items = settings_dict["items"]

        # optional
        continue_on_fail = settings_dict.get("continueOnFail", False)
        workflow_name = settings_dict.get("workflowName", "Unknown")
        workflow_id = settings_dict.get("workflowId", "Unknown")
        node_name = settings_dict.get("nodeName", "Unknown")
        node_id = settings_dict.get("nodeId", "Unknown")
    except KeyError as e:
        raise ValueError(f"Missing field in task settings message: {e}")

    return BrokerTaskSettings(
        task_id=task_id,
        settings=TaskSettings(
            code=code,
            node_mode=node_mode,
            continue_on_fail=continue_on_fail,
            items=items,
            workflow_name=workflow_name,
            workflow_id=workflow_id,
            node_name=node_name,
            node_id=node_id,
        ),
    )


def _parse_task_offer_accept(d: dict) -> BrokerTaskOfferAccept:
    try:
        task_id = d["taskId"]
        offer_id = d["offerId"]
    except KeyError as e:
        raise ValueError(f"Missing field in task offer acceptance message: {e}")

    return BrokerTaskOfferAccept(task_id=task_id, offer_id=offer_id)


def _parse_task_cancel(d: dict) -> BrokerTaskCancel:
    try:
        task_id = d["taskId"]
        reason = d["reason"]
    except KeyError as e:
        raise ValueError(f"Missing field in task cancel message: {e}")

    return BrokerTaskCancel(task_id=task_id, reason=reason)


def _parse_rpc_response(d: dict) -> BrokerRpcResponse:
    try:
        call_id = d["callId"]
        task_id = d["taskId"]
        status = d["status"]
    except KeyError as e:
        raise ValueError(f"Missing field in RPC response message: {e}")

    return BrokerRpcResponse(call_id, task_id, status)


MESSAGE_TYPE_MAP = {
    BROKER_INFO_REQUEST: lambda _: BrokerInfoRequest(),
    BROKER_RUNNER_REGISTERED: lambda _: BrokerRunnerRegistered(),
    BROKER_TASK_OFFER_ACCEPT: _parse_task_offer_accept,
    BROKER_TASK_SETTINGS: _parse_task_settings,
    BROKER_TASK_CANCEL: _parse_task_cancel,
    BROKER_RPC_RESPONSE: _parse_rpc_response,
}


class MessageSerde:
    """Responsible for deserializing incoming messages and serializing outgoing messages."""

    @staticmethod
    def deserialize_broker_message(data: str) -> BrokerMessage:
        message_dict = json.loads(data)
        message_type = message_dict.get("type")

        if message_type not in MESSAGE_TYPE_MAP:
            raise ValueError(f"Unknown message type: {message_type}")

        return MESSAGE_TYPE_MAP[message_type](message_dict)

    @staticmethod
    def serialize_runner_message(message: RunnerMessage) -> str:
        data = asdict(message)
        camel_case_data = {
            MessageSerde._snake_to_camel_case(k): v for k, v in data.items()
        }
        return json.dumps(camel_case_data)

    @staticmethod
    def _snake_to_camel_case(snake_case_str: str) -> str:
        parts = snake_case_str.split("_")
        return parts[0] + "".join(word.capitalize() for word in parts[1:])
