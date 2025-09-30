from dataclasses import dataclass

from src.env import read_str_env
from src.constants import (
    ENV_DEPLOYMENT_NAME,
    ENV_ENVIRONMENT,
    ENV_N8N_VERSION,
    ENV_SENTRY_DSN,
)


@dataclass
class SentryConfig:
    dsn: str
    n8n_version: str
    environment: str
    deployment_name: str

    @property
    def enabled(self) -> bool:
        return bool(self.dsn)

    @classmethod
    def from_env(cls):
        return cls(
            dsn=read_str_env(ENV_SENTRY_DSN, ""),
            n8n_version=read_str_env(ENV_N8N_VERSION, ""),
            environment=read_str_env(ENV_ENVIRONMENT, ""),
            deployment_name=read_str_env(ENV_DEPLOYMENT_NAME, ""),
        )
