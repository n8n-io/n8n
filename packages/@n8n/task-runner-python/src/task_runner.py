import asyncio
import logging
import time
from typing import Dict, Optional, Any, Callable, Awaitable
from urllib.parse import urlparse
import websockets
import random


from src.config.task_runner_config import TaskRunnerConfig
from src.errors import (
    NoIdleTimeoutHandlerError,
    TaskMissingError,
    WebsocketConnectionError,
)
from src.message_types.broker import TaskSettings
from src.nanoid import nanoid

from src.constants import (
    RUNNER_NAME,
    TASK_REJECTED_REASON_AT_CAPACITY,
    TASK_REJECTED_REASON_OFFER_EXPIRED,
    TASK_TYPE_PYTHON,
    OFFER_INTERVAL,
    OFFER_VALIDITY,
    OFFER_VALIDITY_MAX_JITTER,
    OFFER_VALIDITY_LATENCY_BUFFER,
    TASK_BROKER_WS_PATH,
    RPC_BROWSER_CONSOLE_LOG_METHOD,
    LOG_TASK_COMPLETE,
    LOG_TASK_CANCEL,
    LOG_TASK_CANCEL_UNKNOWN,
    LOG_TASK_CANCEL_WAITING,
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
    RunnerInfo,
    RunnerTaskOffer,
    RunnerTaskAccepted,
    RunnerTaskRejected,
    RunnerTaskDone,
    RunnerTaskError,
    RunnerRpcCall,
)
from src.message_serde import MessageSerde
from src.task_state import TaskState, TaskStatus
from src.task_executor import TaskExecutor
from src.task_analyzer import TaskAnalyzer


class TaskOffer:
    def __init__(self, offer_id: str, valid_until: float):
        self.offer_id = offer_id
        self.valid_until = valid_until

    @property
    def has_expired(self) -> bool:
        return time.time() > self.valid_until


class TaskRunner:
    def __init__(
        self,
        config: TaskRunnerConfig,
    ):
        self.runner_id = nanoid()
        self.name = RUNNER_NAME
        self.config = config

        self.websocket_connection: Optional[Any] = None
        self.can_send_offers = False

        self.open_offers: Dict[str, TaskOffer] = {}
        self.running_tasks: Dict[str, TaskState] = {}

        self.offers_coroutine: Optional[asyncio.Task] = None
        self.serde = MessageSerde()
        self.executor = TaskExecutor()
        self.analyzer = TaskAnalyzer(config.stdlib_allow, config.external_allow)
        self.logger = logging.getLogger(__name__)

        self.idle_coroutine: Optional[asyncio.Task] = None
        self.on_idle_timeout: Optional[Callable[[], Awaitable[None]]] = None
        self.last_activity_time = time.time()
        self.is_shutting_down = False

        self.task_broker_uri = config.task_broker_uri
        websocket_host = urlparse(config.task_broker_uri).netloc
        self.websocket_url = (
            f"ws://{websocket_host}{TASK_BROKER_WS_PATH}?id={self.runner_id}"
        )

    @property
    def running_tasks_count(self) -> int:
        return len(self.running_tasks)

    async def start(self) -> None:
        if self.config.is_auto_shutdown_enabled and not self.on_idle_timeout:
            raise NoIdleTimeoutHandlerError(self.config.auto_shutdown_timeout)

        headers = {"Authorization": f"Bearer {self.config.grant_token}"}

        while not self.is_shutting_down:
            try:
                self.websocket_connection = await websockets.connect(
                    self.websocket_url,
                    additional_headers=headers,
                    max_size=self.config.max_payload_size,
                )
                self.logger.info("Connected to broker")
                await self._listen_for_messages()

            except Exception:
                raise WebsocketConnectionError(self.task_broker_uri)

            if not self.is_shutting_down:
                self.websocket_connection = None
                self.can_send_offers = False
                await self._cancel_coroutine(self.offers_coroutine)
                await self._cancel_coroutine(self.idle_coroutine)
                await asyncio.sleep(5)

    async def _cancel_coroutine(self, coroutine: Optional[asyncio.Task]) -> None:
        if coroutine and not coroutine.done():
            coroutine.cancel()
            try:
                await coroutine
            except asyncio.CancelledError:
                pass

    # ========== Shutdown ==========

    async def stop(self) -> None:
        self.is_shutting_down = True
        self.can_send_offers = False

        await self._cancel_coroutine(self.offers_coroutine)
        await self._cancel_coroutine(self.idle_coroutine)

        await self._wait_for_tasks()
        await self._terminate_tasks()

        if self.websocket_connection:
            await self.websocket_connection.close()
            self.logger.info("Disconnected from broker")

        self.logger.info("Runner stopped")

    async def _wait_for_tasks(self):
        if not self.running_tasks:
            return

        timeout = self.config.graceful_shutdown_timeout
        self.logger.debug(
            f"Waiting for {self.running_tasks_count} tasks to complete (timeout: {timeout}s)..."
        )

        start_time = time.time()
        while self.running_tasks and (time.time() - start_time) < timeout:
            await asyncio.sleep(0.5)

        if self.running_tasks:
            self.logger.warning(
                f"Timed out waiting for {self.running_tasks_count} tasks to complete"
            )

    async def _terminate_tasks(self):
        if not self.running_tasks:
            return

        self.logger.warning(f"Terminating {self.running_tasks_count} tasks...")

        tasks_to_terminate = [
            asyncio.to_thread(self.executor.stop_process, task_state.process)
            for task_state in self.running_tasks.values()
            if task_state.process
        ]

        if tasks_to_terminate:
            await asyncio.gather(*tasks_to_terminate, return_exceptions=True)

        self.running_tasks.clear()

        self.logger.warning("Terminated tasks")

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
            case BrokerRpcResponse():
                pass  # currently only logging, already handled by browser
            case _:
                self.logger.warning(f"Unhandled message type: {type(message)}")

    async def _handle_info_request(self) -> None:
        response = RunnerInfo(name=self.name, types=[TASK_TYPE_PYTHON])
        await self._send_message(response)

    async def _handle_runner_registered(self) -> None:
        self.can_send_offers = True
        self.offers_coroutine = asyncio.create_task(self._send_offers_loop())
        self.logger.info("Registered with broker")
        self._reset_idle_timer()

    async def _handle_task_offer_accept(self, message: BrokerTaskOfferAccept) -> None:
        offer = self.open_offers.get(message.offer_id)

        if offer is None or offer.has_expired:
            response = RunnerTaskRejected(
                task_id=message.task_id,
                reason=TASK_REJECTED_REASON_OFFER_EXPIRED,
            )
            await self._send_message(response)
            return

        if self.running_tasks_count >= self.config.max_concurrency:
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
        self._reset_idle_timer()

    async def _handle_task_settings(self, message: BrokerTaskSettings) -> None:
        task_state = self.running_tasks.get(message.task_id)
        if task_state is None:
            raise TaskMissingError(message.task_id)

        if task_state.status != TaskStatus.WAITING_FOR_SETTINGS:
            self.logger.warning(
                f"Received settings for task but it is already {task_state.status}. Discarding message."
            )
            return

        task_state.workflow_name = message.settings.workflow_name
        task_state.workflow_id = message.settings.workflow_id
        task_state.node_name = message.settings.node_name
        task_state.node_id = message.settings.node_id

        task_state.status = TaskStatus.RUNNING
        asyncio.create_task(self._execute_task(message.task_id, message.settings))
        self.logger.info(f"Received task {message.task_id}")

    async def _execute_task(self, task_id: str, task_settings: TaskSettings) -> None:
        start_time = time.time()

        try:
            task_state = self.running_tasks.get(task_id)

            if task_state is None:
                raise TaskMissingError(task_id)

            self.analyzer.validate(task_settings.code)

            process, queue = self.executor.create_process(
                code=task_settings.code,
                node_mode=task_settings.node_mode,
                items=task_settings.items,
                stdlib_allow=self.config.stdlib_allow,
                external_allow=self.config.external_allow,
                builtins_deny=self.config.builtins_deny,
                can_log=task_settings.can_log,
            )

            task_state.process = process

            result, print_args = self.executor.execute_process(
                process=process,
                queue=queue,
                task_timeout=self.config.task_timeout,
                continue_on_fail=task_settings.continue_on_fail,
            )

            for print_args_per_call in print_args:
                await self._send_rpc_message(
                    task_id, RPC_BROWSER_CONSOLE_LOG_METHOD, print_args_per_call
                )

            response = RunnerTaskDone(task_id=task_id, data={"result": result})
            await self._send_message(response)

            self.logger.info(
                LOG_TASK_COMPLETE.format(
                    task_id=task_id,
                    duration=self._get_duration(start_time),
                    **task_state.context(),
                )
            )

        except Exception as e:
            self.logger.error(f"Task {task_id} failed", exc_info=True)
            error = {
                "message": getattr(e, "message", str(e)),
                "description": getattr(e, "description", ""),
            }
            response = RunnerTaskError(task_id=task_id, error=error)
            await self._send_message(response)

        finally:
            self.running_tasks.pop(task_id, None)
            self._reset_idle_timer()

    async def _handle_task_cancel(self, message: BrokerTaskCancel) -> None:
        task_id = message.task_id
        task_state = self.running_tasks.get(task_id)

        if task_state is None:
            self.logger.warning(LOG_TASK_CANCEL_UNKNOWN.format(task_id=task_id))
            return

        if task_state.status == TaskStatus.WAITING_FOR_SETTINGS:
            self.running_tasks.pop(task_id, None)
            self.logger.info(LOG_TASK_CANCEL_WAITING.format(task_id=task_id))
            await self._send_offers()
            return

        if task_state.status == TaskStatus.RUNNING:
            task_state.status = TaskStatus.ABORTING
            self.executor.stop_process(task_state.process)

            self.logger.info(
                LOG_TASK_CANCEL.format(task_id=task_id, **task_state.context())
            )

    async def _send_rpc_message(self, task_id: str, method_name: str, params: list):
        message = RunnerRpcCall(
            call_id=nanoid(), task_id=task_id, name=method_name, params=params
        )

        await self._send_message(message)

    async def _send_message(self, message: RunnerMessage) -> None:
        if self.websocket_connection is None:
            raise WebsocketConnectionError(self.task_broker_uri)

        serialized = self.serde.serialize_runner_message(message)
        await self.websocket_connection.send(serialized)

    def _get_duration(self, start_time: float) -> str:
        elapsed = time.time() - start_time

        if elapsed < 1:
            return f"{int(elapsed * 1000)}ms"

        if elapsed < 60:
            return f"{int(elapsed)}s"

        return f"{int(elapsed) // 60}m"

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

        offers_to_send = self.config.max_concurrency - (
            len(self.open_offers) + self.running_tasks_count
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

    # ========== Inactivity ==========

    def _reset_idle_timer(self):
        """Reset idle timer when key event occurs, namely runner registration, task acceptance, and task completion or failure."""

        if not self.config.is_auto_shutdown_enabled:
            return

        self.last_activity_time = time.time()

        if self.idle_coroutine and not self.idle_coroutine.done():
            self.idle_coroutine.cancel()

        self.idle_coroutine = asyncio.create_task(self._idle_timer_coroutine())

    async def _idle_timer_coroutine(self):
        try:
            await asyncio.sleep(self.config.auto_shutdown_timeout)

            if self.running_tasks_count > 0:
                return

            assert self.on_idle_timeout is not None  # validated at start()

            await self.on_idle_timeout()
        except asyncio.CancelledError:
            pass
