import os
from dataclasses import dataclass


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
            dsn=os.getenv("N8N_SENTRY_DSN", ""),
            n8n_version=os.getenv("N8N_VERSION", ""),
            environment=os.getenv("ENVIRONMENT", ""),
            deployment_name=os.getenv("DEPLOYMENT_NAME", ""),
        )
