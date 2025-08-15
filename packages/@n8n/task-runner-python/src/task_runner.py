import asyncio
import logging
import time
from typing import Dict, Optional
from urllib.parse import urlparse
from typing import Any
import websockets
import random

from nanoid import generate as nanoid

from .constants import (
    TASK_TYPE_PYTHON,
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_MAX_PAYLOAD_SIZE,
    OFFER_INTERVAL,
    OFFER_VALIDITY,
    OFFER_VALIDITY_MAX_JITTER,
    OFFER_VALIDITY_LATENCY_BUFFER,
    WS_RUNNERS_PATH,
)
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
    def has_expired(self) -> bool:
        return time.time() > self.valid_until


class TaskRunner:
    def __init__(
        self,
        task_broker_uri: str = "http://127.0.0.1:5679",
        grant_token: str = "",
    ):
        self.runner_id = nanoid()

        self.task_broker_uri = task_broker_uri
        self.grant_token = grant_token
        self.name = "Python Task Runner"
        self.max_concurrency = DEFAULT_MAX_CONCURRENCY
        self.max_payload_size = DEFAULT_MAX_PAYLOAD_SIZE

        self.websocket: Optional[Any] = None
        self.can_send_offers = False

        self.open_offers: Dict[str, TaskOffer] = {}  # offer_id -> TaskOffer
        self.running_tasks: Dict[str, str] = {}  # task_id -> offer_id

        self.offers_coroutine: Optional[asyncio.Task] = None

        ws_host = urlparse(task_broker_uri).netloc
        self.ws_url = f"ws://{ws_host}{WS_RUNNERS_PATH}?id={self.runner_id}"

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

    # ========== Messages ==========

    async def _listen_for_messages(self) -> None:
        if self.websocket is None:
            raise RuntimeError("WebSocket not connected")

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
        response = RunnerInfo(name=self.name, types=[TASK_TYPE_PYTHON])
        await self._send_message(response)

    async def _handle_runner_registered(self) -> None:
        self.can_send_offers = True
        self.offers_coroutine = asyncio.create_task(self._send_offers_loop())

    async def _handle_task_offer_accept(self, message: BrokerTaskOfferAccept) -> None:
        offer = self.open_offers.get(message.offer_id)

        if not offer or offer.has_expired:
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

    async def _send_message(self, message: RunnerMessage) -> None:
        if not self.websocket:
            raise RuntimeError("WebSocket not connected")

        serialized = MessageSerde.serialize_runner_message(message)
        await self.websocket.send(serialized)

    # ========== Offers ==========

    async def _send_offers_loop(self) -> None:
        while self.can_send_offers:
            try:
                await self._send_offers()
                await asyncio.sleep(OFFER_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error sending offers: {e}")

    async def _send_offers(self) -> None:
        if not self.can_send_offers:
            return

        expired_offer_ids = [
            offer_id
            for offer_id, offer in self.open_offers.items()
            if offer.has_expired
        ]

        for offer_id in expired_offer_ids:
            del self.open_offers[offer_id]

        offers_to_send = self.max_concurrency - (
            len(self.open_offers) + len(self.running_tasks)
        )

        for _ in range(offers_to_send):
            offer_id = nanoid()

            valid_for_ms = OFFER_VALIDITY + random.randint(0, OFFER_VALIDITY_MAX_JITTER)

            valid_until = (
                time.time() + (valid_for_ms / 1000) + OFFER_VALIDITY_LATENCY_BUFFER
            )

            offer = TaskOffer(offer_id, valid_until)
            self.open_offers[offer_id] = offer

            message = RunnerTaskOffer(
                offer_id=offer_id, task_type=TASK_TYPE_PYTHON, valid_for=valid_for_ms
            )

            await self._send_message(message)
