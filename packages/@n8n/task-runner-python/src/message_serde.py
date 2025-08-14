import json
from dataclasses import asdict
from .message_types import (
    BrokerMessage,
    RunnerMessage,
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    BrokerTaskCancel,
    BrokerTaskSettings,
)


class MessageSerde:
    MESSAGE_TYPE_MAP = {
        "broker:inforequest": lambda d: BrokerInfoRequest(),
        "broker:runnerregistered": lambda d: BrokerRunnerRegistered(),
        "broker:taskofferaccept": lambda d: BrokerTaskOfferAccept(
            task_id=d["taskId"], offer_id=d["offerId"]
        ),
        "broker:taskcancel": lambda d: BrokerTaskCancel(
            task_id=d["taskId"], reason=d["reason"]
        ),
        "broker:tasksettings": lambda d: BrokerTaskSettings(
            task_id=d["taskId"], settings=d["settings"]
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
        camel_data = {MessageSerde._snake_to_camel_case(k): v for k, v in data.items()}
        return json.dumps(camel_data)

    @staticmethod
    def _snake_to_camel_case(snake_case_str: str) -> str:
        parts = snake_case_str.split("_")
        return parts[0] + "".join(word.capitalize() for word in parts[1:])
