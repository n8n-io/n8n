import os
from dataclasses import dataclass

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
            dsn=os.getenv(ENV_SENTRY_DSN, ""),
            n8n_version=os.getenv(ENV_N8N_VERSION, ""),
            environment=os.getenv(ENV_ENVIRONMENT, ""),
            deployment_name=os.getenv(ENV_DEPLOYMENT_NAME, ""),
        )
