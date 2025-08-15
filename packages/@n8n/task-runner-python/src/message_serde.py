import json
from dataclasses import asdict
from .constants import (
    BROKER_INFO_REQUEST,
    BROKER_RUNNER_REGISTERED,
    BROKER_TASK_OFFER_ACCEPT,
)
from .message_types import (
    BrokerMessage,
    RunnerMessage,
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
)


class MessageSerde:
    """Handles serialization and deserialization of broker and runner messages."""

    MESSAGE_TYPE_MAP = {
        BROKER_INFO_REQUEST: lambda _: BrokerInfoRequest(),
        BROKER_RUNNER_REGISTERED: lambda _: BrokerRunnerRegistered(),
        BROKER_TASK_OFFER_ACCEPT: lambda d: BrokerTaskOfferAccept(
            task_id=d["taskId"], offer_id=d["offerId"]
        ),
    }

    @staticmethod
    def deserialize_broker_message(data: str) -> BrokerMessage:
        message_dict = json.loads(data)
        message_type = message_dict.get("type")

        if message_type in MessageSerde.MESSAGE_TYPE_MAP:
            return MessageSerde.MESSAGE_TYPE_MAP[message_type](message_dict)
        else:
            raise ValueError(f"Unknown message type: {message_type}")

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
