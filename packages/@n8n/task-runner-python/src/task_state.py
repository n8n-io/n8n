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
    workflow_name: Optional[str] = None
    workflow_id: Optional[str] = None
    node_name: Optional[str] = None
    node_id: Optional[str] = None

    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = TaskStatus.WAITING_FOR_SETTINGS
        self.process = None
        self.workflow_name = None
        self.workflow_id = None
        self.node_name = None
        self.node_id = None

    def context(self):
        return {
            "node_name": self.node_name,
            "node_id": self.node_id,
            "workflow_name": self.workflow_name,
            "workflow_id": self.workflow_id,
        }
