from dataclasses import dataclass

from src.env import read_env
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
        port_str = read_env(ENV_HEALTH_CHECK_SERVER_PORT) or str(
            DEFAULT_HEALTH_CHECK_SERVER_PORT
        )
        port = int(port_str)
        if port < 1 or port > 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {port}")

        enabled_str = read_env(ENV_HEALTH_CHECK_SERVER_ENABLED) or "false"
        enabled = enabled_str.lower() == "true"

        return cls(
            enabled=enabled,
            host=read_env(ENV_HEALTH_CHECK_SERVER_HOST)
            or DEFAULT_HEALTH_CHECK_SERVER_HOST,
            port=port,
        )
