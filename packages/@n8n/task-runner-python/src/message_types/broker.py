from dataclasses import dataclass
from typing import Literal, Union


@dataclass
class BrokerInfoRequest:
    type: Literal["broker:inforequest"] = "broker:inforequest"


@dataclass
class BrokerRunnerRegistered:
    type: Literal["broker:runnerregistered"] = "broker:runnerregistered"


@dataclass
class BrokerTaskOfferAccept:
    task_id: str
    offer_id: str
    type: Literal["broker:taskofferaccept"] = "broker:taskofferaccept"


BrokerMessage = Union[
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
]
