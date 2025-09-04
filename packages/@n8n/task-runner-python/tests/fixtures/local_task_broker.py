import asyncio
import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from aiohttp import web, web_ws
from src.nanoid import nanoid

from tests.fixtures.test_constants import (
    TASK_RESPONSE_WAIT,
    LOCAL_TASK_BROKER_PORT,
    LOCAL_TASK_BROKER_WS_PATH,
)

TaskSettings = dict[str, Any]
WebsocketMessage = dict[str, Any]


@dataclass
class ActiveTask:
    type: str
    settings: TaskSettings


class LocalTaskBroker:
    def __init__(self):
        self.port = LOCAL_TASK_BROKER_PORT
        self.app = web.Application()
        self.runner: web.AppRunner | None = None
        self.site: web.TCPSite | None = None
        self.connections: dict[str, web_ws.WebSocketResponse] = {}
        self.pending_messages: dict[str, asyncio.Queue[WebsocketMessage]] = {}
        self.received_messages: list[WebsocketMessage] = []
        self.active_tasks: dict[str, ActiveTask] = {}
        self.task_settings: dict[str, TaskSettings] = {}
        self.rpc_messages: dict[str, list[dict]] = {}
        self.app.router.add_get(LOCAL_TASK_BROKER_WS_PATH, self.websocket_handler)

    async def start(self) -> None:
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        self.site = web.TCPSite(self.runner, "localhost", self.port)
        await self.site.start()
        print(f"Local task broker started on port {self.port}")

    async def stop(self) -> None:
        for ws in self.connections.values():
            await ws.close()
        self.connections.clear()

        if self.site:
            await self.site.stop()

        if self.runner:
            await self.runner.cleanup()

    async def websocket_handler(self, request: web.Request) -> web_ws.WebSocketResponse:
        print(f"WebSocket connection request from {request.remote}")
        ws = web_ws.WebSocketResponse()
        await ws.prepare(request)
        connection_id = nanoid()
        self.connections[connection_id] = ws
        self.pending_messages[connection_id] = asyncio.Queue()

        sender_coroutine = asyncio.create_task(self._message_sender(connection_id, ws))

        try:
            await self.send_to_connection(connection_id, {"type": "broker:inforequest"})

            async for message in ws:
                if message.type == web_ws.WSMsgType.TEXT:
                    json_message = json.loads(message.data)
                    self.received_messages.append(json_message)
                    await self._handle_message(connection_id, json_message)
        finally:
            sender_coroutine.cancel()
            try:
                await sender_coroutine
            except asyncio.CancelledError:
                pass

            del self.connections[connection_id]
            del self.pending_messages[connection_id]

        return ws

    async def _message_sender(self, connection_id: str, ws: web_ws.WebSocketResponse):
        while True:
            message = await self.pending_messages[connection_id].get()
            await ws.send_str(json.dumps(message))

    async def _handle_message(self, connection_id: str, message: WebsocketMessage):
        match message.get("type"):
            case "runner:info":
                await self.send_to_connection(
                    connection_id, {"type": "broker:runnerregistered"}
                )

            case "runner:taskoffer":
                pass  # Handled by send_task() which waits for them

            case "runner:taskaccepted":
                task_id = message.get("taskId")
                if task_id in self.task_settings:
                    await self.send_to_connection(
                        connection_id,
                        {
                            "type": "broker:tasksettings",
                            "taskId": task_id,
                            "settings": self.task_settings[task_id],
                        },
                    )

            case "runner:taskdone" | "runner:taskerror":
                task_id = message.get("taskId")
                if task_id in self.active_tasks:
                    del self.active_tasks[task_id]

            case "runner:rpc":
                task_id = message.get("taskId")
                if task_id:
                    if task_id not in self.rpc_messages:
                        self.rpc_messages[task_id] = []
                    self.rpc_messages[task_id].append(
                        {"method": message.get("name"), "params": message.get("params")}
                    )

    async def send_to_connection(self, connection_id: str, message: WebsocketMessage):
        if connection_id in self.pending_messages:
            await self.pending_messages[connection_id].put(message)

    async def send_task(
        self,
        task_id: str,
        task_type: str,
        task_settings: TaskSettings,
    ):
        self.active_tasks[task_id] = ActiveTask(type=task_type, settings=task_settings)
        self.task_settings[task_id] = task_settings

        offer_message = await self.wait_for_message("runner:taskoffer", timeout=2.0)

        if offer_message:
            offer_id = offer_message.get("offerId")

            accept_msg = {
                "type": "broker:taskofferaccept",
                "taskId": task_id,
                "offerId": offer_id,
            }

            if self.connections:
                first_conn = next(iter(self.connections.keys()))
                await self.send_to_connection(first_conn, accept_msg)

    async def cancel_task(self, task_id: str, reason: str):
        cancel_message = {
            "type": "broker:taskcancel",
            "taskId": task_id,
            "reason": reason,
        }

        for connection_id in self.connections:
            await self.send_to_connection(connection_id, cancel_message)

    async def wait_for_message(
        self,
        message_type: str,
        timeout: float = TASK_RESPONSE_WAIT,
        predicate: Callable[[WebsocketMessage], bool] | None = None,
    ) -> WebsocketMessage | None:
        start_time = asyncio.get_running_loop().time()

        while asyncio.get_running_loop().time() - start_time < timeout:
            for msg in self.received_messages:
                if msg.get("type") == message_type:
                    if predicate is None or predicate(msg):
                        return msg

            await asyncio.sleep(0.1)

        return None

    def get_messages_of_type(self, message_type: str) -> list[WebsocketMessage]:
        return [
            msg for msg in self.received_messages if msg.get("type") == message_type
        ]

    def get_task_rpc_messages(self, task_id: str) -> list[dict]:
        return self.rpc_messages.get(task_id, [])
