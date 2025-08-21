from enum import Enum
from dataclasses import dataclass
from multiprocessing.context import SpawnProcess
from typing import Optional


class TaskStatus(Enum):
    WAITING_FOR_SETTINGS = "waiting_for_settings"
    RUNNING = "running"
    ABORTING = "aborting"


@dataclass
class TaskState:
    task_id: str
    status: TaskStatus
    process: Optional[SpawnProcess] = None

    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = TaskStatus.WAITING_FOR_SETTINGS
        self.process = None
