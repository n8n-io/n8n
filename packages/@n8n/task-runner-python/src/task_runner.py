import asyncio
import logging
import time
from typing import Dict, Optional
from urllib.parse import urlparse
from typing import Any
import websockets
import random


from nanoid import generate


from .message_types import (
    BrokerMessage,
    RunnerMessage,
    BrokerInfoRequest,
    BrokerRunnerRegistered,
    BrokerTaskOfferAccept,
    RunnerInfo,
    RunnerTaskOffer,
    RunnerTaskAccepted,
    RunnerTaskRejected,
)
from .message_serde import MessageSerde

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class TaskOffer:
    def __init__(self, offer_id: str, valid_until: float):
        self.offer_id = offer_id
        self.valid_until = valid_until

    @property
    def is_expired(self) -> bool:
        return time.time() > self.valid_until


class TaskRunner:
    def __init__(
        self,
        task_broker_uri: str = "http://127.0.0.1:5679",
        grant_token: str = "",
    ):
        self.runner_id = generate()

        self.task_broker_uri = task_broker_uri
        self.grant_token = grant_token
        self.name = "Python Task Runner"
        self.max_concurrency = 5
        self.max_payload_size: int = 1024 * 1024 * 1024  # 1 GiB

        self.websocket: Optional[Any] = None
        self.can_send_offers = False

        self.open_offers: Dict[str, TaskOffer] = {}
        self.running_tasks: Dict[str, str] = {}  # task_id -> offer_id

        self.offers_coroutine: Optional[asyncio.Task] = None
        self.cleanup_coroutine: Optional[asyncio.Task] = None

        ws_host = urlparse(task_broker_uri).netloc
        self.ws_url = f"ws://{ws_host}/runners/_ws?id={self.runner_id}"

    async def start(self) -> None:
        logger.info("Starting Python task runner...")

        headers = {"Authorization": f"Bearer {self.grant_token}"}

        try:
            self.websocket = await websockets.connect(
                self.ws_url,
                additional_headers=headers,
                max_size=self.max_payload_size,
            )

            logger.info(f"Connected to task broker at {self.ws_url}")

            await self._listen_for_messages()

        except Exception as e:
            logger.error(f"Failed to connect to task broker: {e}")
            raise

    async def stop(self) -> None:
        logger.info("Stopping Python task runner...")

        if self.offers_coroutine:
            self.offers_coroutine.cancel()

        if self.websocket:
            await self.websocket.close()

    # ========== Offers ==========

    async def _send_offers_loop(self) -> None:
        while self.can_send_offers:
            try:
                await self._send_offers()
                await asyncio.sleep(0.25)  # 250ms
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error sending offers: {e}")
                await asyncio.sleep(1)

    async def _send_offers(self) -> None:
        if not self.can_send_offers:
            return

        expired_offer_ids = [
            offer_id for offer_id, offer in self.open_offers.items() if offer.is_expired
        ]

        for offer_id in expired_offer_ids:
            del self.open_offers[offer_id]

        total_capacity = len(self.open_offers) + len(self.running_tasks)
        offers_to_send = self.max_concurrency - total_capacity

        for _ in range(offers_to_send):
            offer_id = generate()
            valid_for_ms = 5000 + random.randint(0, 500)
            valid_until = (
                time.time() + (valid_for_ms / 1000) + 0.1
            )  # 100ms buffer for latency

            offer = TaskOffer(offer_id, valid_until)
            self.open_offers[offer_id] = offer

            message = RunnerTaskOffer(
                offer_id=offer_id, task_type="python", valid_for=valid_for_ms
            )

            await self._send_message(message)

    # ========== Messages ==========

    async def _listen_for_messages(self) -> None:
        async for raw_message in self.websocket:
            try:
                message = MessageSerde.deserialize_broker_message(raw_message)
                await self._handle_message(message)
            except Exception as e:
                logger.error(f"Error handling message: {e}")

    async def _handle_message(self, message: BrokerMessage) -> None:
        if isinstance(message, BrokerInfoRequest):
            await self._handle_info_request()
        elif isinstance(message, BrokerRunnerRegistered):
            await self._handle_runner_registered()
        elif isinstance(message, BrokerTaskOfferAccept):
            await self._handle_task_offer_accept(message)
        else:
            logger.warning(f"Unhandled message type: {type(message)}")

    async def _handle_info_request(self) -> None:
        response = RunnerInfo(name=self.name, types=["python"])
        await self._send_message(response)
        logger.debug("Sent runner info to broker")

    async def _handle_runner_registered(self) -> None:
        self.can_send_offers = True
        self.offers_coroutine = asyncio.create_task(self._send_offers_loop())
        logger.info("Runner registered with broker")

    async def _handle_task_offer_accept(self, message: BrokerTaskOfferAccept) -> None:
        offer = self.open_offers.get(message.offer_id)

        if not offer:
            response = RunnerTaskRejected(
                task_id=message.task_id,
                reason="Offer expired - not accepted within validity window",
            )
            await self._send_message(response)
            return

        if len(self.running_tasks) >= self.max_concurrency:
            response = RunnerTaskRejected(
                task_id=message.task_id,
                reason="No open task slots - runner already at capacity",
            )
            await self._send_message(response)
            return

        del self.open_offers[message.offer_id]
        self.running_tasks[message.task_id] = message.offer_id

        response = RunnerTaskAccepted(task_id=message.task_id)
        await self._send_message(response)

        logger.info(f"Accepted task {message.task_id}")

    async def _send_message(self, message: RunnerMessage) -> None:
        if not self.websocket:
            raise RuntimeError("WebSocket not connected")

        serialized = MessageSerde.serialize_runner_message(message)
        await self.websocket.send(serialized)
