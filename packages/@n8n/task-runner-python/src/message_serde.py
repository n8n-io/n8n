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
    @staticmethod
    def deserialize_broker_message(data: str) -> BrokerMessage:
        message_dict = json.loads(data)
        message_type = message_dict.get("type")

        if message_type == "broker:inforequest":
            return BrokerInfoRequest()
        elif message_type == "broker:runnerregistered":
            return BrokerRunnerRegistered()
        elif message_type == "broker:taskofferaccept":
            return BrokerTaskOfferAccept(
                task_id=message_dict["taskId"], offer_id=message_dict["offerId"]
            )
        elif message_type == "broker:taskcancel":
            return BrokerTaskCancel(
                task_id=message_dict["taskId"], reason=message_dict["reason"]
            )
        elif message_type == "broker:tasksettings":
            return BrokerTaskSettings(
                task_id=message_dict["taskId"], settings=message_dict["settings"]
            )
        else:
            raise ValueError(f"Unknown message type: {message_type}")

    @staticmethod
    def serialize_runner_message(message: RunnerMessage) -> str:
        data = asdict(message)

        # broker expects camelCase

        if "task_id" in data:
            data["taskId"] = data.pop("task_id")
        if "offer_id" in data:
            data["offerId"] = data.pop("offer_id")
        if "task_type" in data:
            data["taskType"] = data.pop("task_type")
        if "valid_for" in data:
            data["validFor"] = data.pop("valid_for")

        return json.dumps(data)
