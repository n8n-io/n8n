from dataclasses import dataclass

from src.env import read_int_env, read_bool_env, read_str_env
from src.errors import ConfigurationError
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
        port = read_int_env(
            ENV_HEALTH_CHECK_SERVER_PORT, DEFAULT_HEALTH_CHECK_SERVER_PORT
        )
        if port < 1 or port > 65535:
            raise ConfigurationError(f"Port must be between 1 and 65535, got {port}")

        return cls(
            enabled=read_bool_env(ENV_HEALTH_CHECK_SERVER_ENABLED, default=False),
            host=read_str_env(
                ENV_HEALTH_CHECK_SERVER_HOST, DEFAULT_HEALTH_CHECK_SERVER_HOST
            ),
            port=port,
        )
