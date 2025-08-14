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
        msg_dict = json.loads(data)
        msg_type = msg_dict.get("type")

        if msg_type == "broker:inforequest":
            return BrokerInfoRequest()
        elif msg_type == "broker:runnerregistered":
            return BrokerRunnerRegistered()
        elif msg_type == "broker:taskofferaccept":
            return BrokerTaskOfferAccept(
                task_id=msg_dict["taskId"], offer_id=msg_dict["offerId"]
            )
        elif msg_type == "broker:taskcancel":
            return BrokerTaskCancel(
                task_id=msg_dict["taskId"], reason=msg_dict["reason"]
            )
        elif msg_type == "broker:tasksettings":
            return BrokerTaskSettings(
                task_id=msg_dict["taskId"], settings=msg_dict["settings"]
            )
        else:
            raise ValueError(f"Unknown message type: {msg_type}")

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
