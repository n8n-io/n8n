import asyncio
import errno
import logging
from typing import Optional

from src.config.health_check_config import HealthCheckConfig

HEALTH_CHECK_RESPONSE = (
    b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\n\r\nOK"
)


class HealthCheckServer:
    def __init__(self):
        self.server: Optional[asyncio.Server] = None
        self.logger = logging.getLogger(__name__)

    async def start(self, config: HealthCheckConfig) -> None:
        try:
            self.server = await asyncio.start_server(
                self._handle_request, config.host, config.port
            )
            self.logger.info(
                f"Health check server listening on {config.host}, port {config.port}"
            )
        except OSError as e:
            if e.errno == errno.EADDRINUSE:
                raise OSError(f"Port {config.port} is already in use") from e
            else:
                raise

    async def stop(self) -> None:
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None
            self.logger.info("Health check server stopped")

    async def _handle_request(
        self, _reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        try:
            writer.write(HEALTH_CHECK_RESPONSE)
            await writer.drain()
        except Exception:
            pass
        finally:
            writer.close()
            await writer.wait_closed()
