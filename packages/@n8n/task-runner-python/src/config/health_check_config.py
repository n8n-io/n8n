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
        return cls(
            enabled=os.getenv(ENV_HEALTH_CHECK_SERVER_ENABLED, "false").lower()
            == "true",
            host=os.getenv(
                ENV_HEALTH_CHECK_SERVER_HOST, DEFAULT_HEALTH_CHECK_SERVER_HOST
            ),
            port=int(
                os.getenv(
                    ENV_HEALTH_CHECK_SERVER_PORT, str(DEFAULT_HEALTH_CHECK_SERVER_PORT)
                )
            ),
        )
