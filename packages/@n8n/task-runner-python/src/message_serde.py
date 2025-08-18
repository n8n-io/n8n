import json
from dataclasses import asdict
from typing import cast

from .message_types.broker import NodeMode, TaskSettings
from .constants import (
    BROKER_INFO_REQUEST,
    BROKER_RUNNER_REGISTERED,
    BROKER_TASK_CANCEL,
    BROKER_TASK_OFFER_ACCEPT,
    BROKER_TASK_SETTINGS,
)
from .message_types import (
    BrokerMessage,
    RunnerMessage,
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    BrokerTaskSettings,
    BrokerTaskCancel,
)


NODE_MODE_MAP = {
    "runOnceForAllItems": "all_items",
    "runOnceForEachItem": "per_item",
}


MESSAGE_TYPE_MAP = {
    BROKER_INFO_REQUEST: lambda _: BrokerInfoRequest(),
    BROKER_RUNNER_REGISTERED: lambda _: BrokerRunnerRegistered(),
    BROKER_TASK_OFFER_ACCEPT: lambda d: BrokerTaskOfferAccept(
        task_id=d["taskId"], offer_id=d["offerId"]
    ),
    BROKER_TASK_SETTINGS: lambda d: BrokerTaskSettings(
        task_id=d["taskId"],
        settings=TaskSettings(
            code=d["settings"]["code"],
            node_mode=cast(
                NodeMode,
                NODE_MODE_MAP.get(d["settings"]["nodeMode"]),
            ),
            continue_on_fail=d["settings"]["continueOnFail"],
            items=d["settings"]["items"],
        ),
    ),
    BROKER_TASK_CANCEL: lambda d: BrokerTaskCancel(
        task_id=d["taskId"], reason=d["reason"]
    ),
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
