from dataclasses import dataclass

from src.env import read_env
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
            dsn=read_env(ENV_SENTRY_DSN) or "",
            n8n_version=read_env(ENV_N8N_VERSION) or "",
            environment=read_env(ENV_ENVIRONMENT) or "",
            deployment_name=read_env(ENV_DEPLOYMENT_NAME) or "",
        )
