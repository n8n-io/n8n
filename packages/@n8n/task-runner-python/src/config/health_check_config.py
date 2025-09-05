import os
from dataclasses import dataclass

from src.constants import (
    DEFAULT_HEALTH_CHECK_SERVER_HOST,
    DEFAULT_HEALTH_CHECK_SERVER_PORT,
    ENV_HEALTH_CHECK_SERVER_ENABLED,
    ENV_HEALTH_CHECK_SERVER_HOST,
    ENV_HEALTH_CHECK_SERVER_PORT,
)


@dataclass
class HealthCheckConfig:
    enabled: bool
    host: str
    port: int

    @classmethod
    def from_env(cls):
        port_str = os.getenv(
            ENV_HEALTH_CHECK_SERVER_PORT, str(DEFAULT_HEALTH_CHECK_SERVER_PORT)
        )
        port = int(port_str)
        if port < 1 or port > 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {port}")

        return cls(
            enabled=os.getenv(ENV_HEALTH_CHECK_SERVER_ENABLED, "false").lower()
            == "true",
            host=os.getenv(
                ENV_HEALTH_CHECK_SERVER_HOST, DEFAULT_HEALTH_CHECK_SERVER_HOST
            ),
            port=port,
        )
