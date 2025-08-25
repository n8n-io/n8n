import asyncio
from dataclasses import dataclass
import logging
import time
from typing import Dict, Optional, Any
from urllib.parse import urlparse
import websockets
import random


from .errors import WebsocketConnectionError, TaskMissingError
from .message_types.broker import TaskSettings
from .nanoid import nanoid

from .constants import (
    RUNNER_NAME,
    TASK_REJECTED_REASON_AT_CAPACITY,
    TASK_REJECTED_REASON_OFFER_EXPIRED,
    TASK_TYPE_PYTHON,
    OFFER_INTERVAL,
    OFFER_VALIDITY,
    OFFER_VALIDITY_MAX_JITTER,
    OFFER_VALIDITY_LATENCY_BUFFER,
    TASK_BROKER_WS_PATH,
)
from .message_types import (
    BrokerMessage,
    RunnerMessage,
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    BrokerTaskSettings,
    BrokerTaskCancel,
    RunnerInfo,
    RunnerTaskOffer,
    RunnerTaskAccepted,
    RunnerTaskRejected,
    RunnerTaskDone,
    RunnerTaskError,
)
from .message_serde import MessageSerde
from .task_state import TaskState, TaskStatus
from .task_executor import TaskExecutor


class TaskOffer:
    def __init__(self, offer_id: str, valid_until: float):
        self.offer_id = offer_id
        self.valid_until = valid_until

    @property
    def has_expired(self) -> bool:
        return time.time() > self.valid_until


@dataclass()
class TaskRunnerOpts:
    grant_token: str
    task_broker_uri: str
    max_concurrency: int
    max_payload_size: int
    task_timeout: int


class TaskRunner:
    def __init__(
        self,
        opts: TaskRunnerOpts,
    ):
        self.runner_id = nanoid()
        self.name = RUNNER_NAME

        self.grant_token = opts.grant_token
        self.opts = opts

        self.websocket_connection: Optional[Any] = None
        self.can_send_offers = False

        self.open_offers: Dict[str, TaskOffer] = {}
        self.running_tasks: Dict[str, TaskState] = {}

        self.offers_coroutine: Optional[asyncio.Task] = None
        self.serde = MessageSerde()
        self.executor = TaskExecutor()
        self.logger = logging.getLogger(__name__)

        self.task_broker_uri = opts.task_broker_uri
        websocket_host = urlparse(opts.task_broker_uri).netloc
        self.websocket_url = (
            f"ws://{websocket_host}{TASK_BROKER_WS_PATH}?id={self.runner_id}"
        )

    async def start(self) -> None:
        headers = {"Authorization": f"Bearer {self.grant_token}"}

        try:
            self.websocket_connection = await websockets.connect(
                self.websocket_url,
                additional_headers=headers,
                max_size=self.opts.max_payload_size,
            )

            self.logger.info("Connected to broker")

            await self._listen_for_messages()

        except Exception:
            raise WebsocketConnectionError(self.task_broker_uri)

    async def stop(self) -> None:
        if self.offers_coroutine:
            self.offers_coroutine.cancel()

        if self.websocket_connection:
            await self.websocket_connection.close()
            self.logger.info("Disconnected from broker")

    # ========== Messages ==========

    async def _listen_for_messages(self) -> None:
        if self.websocket_connection is None:
            raise WebsocketConnectionError(self.task_broker_uri)

        async for raw_message in self.websocket_connection:
            try:
                message = self.serde.deserialize_broker_message(raw_message)
                await self._handle_message(message)
            except Exception as e:
                self.logger.error(f"Error handling message: {e}")

    async def _handle_message(self, message: BrokerMessage) -> None:
        match message:
            case BrokerInfoRequest():
                await self._handle_info_request()
            case BrokerRunnerRegistered():
                await self._handle_runner_registered()
            case BrokerTaskOfferAccept():
                await self._handle_task_offer_accept(message)
            case BrokerTaskSettings():
                await self._handle_task_settings(message)
            case BrokerTaskCancel():
                await self._handle_task_cancel(message)
            case _:
                self.logger.warning(f"Unhandled message type: {type(message)}")

    async def _handle_info_request(self) -> None:
        response = RunnerInfo(name=self.name, types=[TASK_TYPE_PYTHON])
        await self._send_message(response)

    async def _handle_runner_registered(self) -> None:
        self.can_send_offers = True
        self.offers_coroutine = asyncio.create_task(self._send_offers_loop())
        self.logger.info("Registered with broker")

    async def _handle_task_offer_accept(self, message: BrokerTaskOfferAccept) -> None:
        offer = self.open_offers.get(message.offer_id)

        if offer is None or offer.has_expired:
            response = RunnerTaskRejected(
                task_id=message.task_id,
                reason=TASK_REJECTED_REASON_OFFER_EXPIRED,
            )
            await self._send_message(response)
            return

        if len(self.running_tasks) >= self.opts.max_concurrency:
            response = RunnerTaskRejected(
                task_id=message.task_id,
                reason=TASK_REJECTED_REASON_AT_CAPACITY,
            )
            await self._send_message(response)
            return

        del self.open_offers[message.offer_id]

        task_state = TaskState(message.task_id)
        self.running_tasks[message.task_id] = task_state

        response = RunnerTaskAccepted(task_id=message.task_id)
        await self._send_message(response)
        self.logger.info(f"Accepted task {message.task_id}")

    async def _handle_task_settings(self, message: BrokerTaskSettings) -> None:
        task_state = self.running_tasks.get(message.task_id)
        if task_state is None:
            raise TaskMissingError(message.task_id)

        if task_state.status != TaskStatus.WAITING_FOR_SETTINGS:
            self.logger.warning(
                f"Received settings for task but it is already {task_state.status}. Discarding message."
            )
            return

        task_state.status = TaskStatus.RUNNING
        asyncio.create_task(self._execute_task(message.task_id, message.settings))
        self.logger.info(f"Received task {message.task_id}")

    async def _execute_task(self, task_id: str, task_settings: TaskSettings) -> None:
        try:
            task_state = self.running_tasks.get(task_id)

            if task_state is None:
                raise TaskMissingError(task_id)

            process, queue = self.executor.create_process(
                task_settings.code, task_settings.node_mode, task_settings.items
            )

            task_state.process = process

            result = self.executor.execute_process(
                process, queue, self.opts.task_timeout, task_settings.continue_on_fail
            )

            response = RunnerTaskDone(task_id=task_id, data={"result": result})
            await self._send_message(response)
            self.logger.info(f"Completed task {task_id}")

        except Exception as e:
            response = RunnerTaskError(task_id=task_id, error={"message": str(e)})
            await self._send_message(response)

        finally:
            self.running_tasks.pop(task_id, None)

    async def _handle_task_cancel(self, message: BrokerTaskCancel) -> None:
        task_state = self.running_tasks.get(message.task_id)

        if task_state is None:
            self.logger.warning(
                f"Received cancel for unknown task: {message.task_id}. Discarding message."
            )
            return

        if task_state.status == TaskStatus.WAITING_FOR_SETTINGS:
            self.running_tasks.pop(message.task_id, None)
            await self._send_offers()
            return

        if task_state.status == TaskStatus.RUNNING:
            task_state.status = TaskStatus.ABORTING
            self.executor.stop_process(task_state.process)

    async def _send_message(self, message: RunnerMessage) -> None:
        if self.websocket_connection is None:
            raise WebsocketConnectionError(self.task_broker_uri)

        serialized = self.serde.serialize_runner_message(message)
        await self.websocket_connection.send(serialized)

    # ========== Offers ==========

    async def _send_offers_loop(self) -> None:
        while self.can_send_offers:
            try:
                await self._send_offers()
                await asyncio.sleep(OFFER_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error sending offers: {e}")

    async def _send_offers(self) -> None:
        if not self.can_send_offers:
            return

        expired_offer_ids = [
            offer_id
            for offer_id, offer in self.open_offers.items()
            if offer.has_expired
        ]

        for offer_id in expired_offer_ids:
            self.open_offers.pop(offer_id, None)

        offers_to_send = self.opts.max_concurrency - (
            len(self.open_offers) + len(self.running_tasks)
        )

        for _ in range(offers_to_send):
            offer_id = nanoid()

            valid_for_ms = OFFER_VALIDITY + random.randint(0, OFFER_VALIDITY_MAX_JITTER)

            valid_until = (
                time.time() + (valid_for_ms / 1000) + OFFER_VALIDITY_LATENCY_BUFFER
            )

            self.open_offers[offer_id] = TaskOffer(offer_id, valid_until)

            message = RunnerTaskOffer(
                offer_id=offer_id, task_type=TASK_TYPE_PYTHON, valid_for=valid_for_ms
            )

            await self._send_message(message)
