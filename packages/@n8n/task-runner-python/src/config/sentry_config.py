from dataclasses import dataclass

from src.env import read_str_env, read_float_env
from src.constants import (
    ENV_DEPLOYMENT_NAME,
    ENV_ENVIRONMENT,
    ENV_N8N_VERSION,
    ENV_SENTRY_DSN,
    ENV_SENTRY_PROFILES_SAMPLE_RATE,
    ENV_SENTRY_TRACES_SAMPLE_RATE,
)


@dataclass
class SentryConfig:
    dsn: str
    n8n_version: str
    environment: str
    deployment_name: str
    profiles_sample_rate: float
    traces_sample_rate: float

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
            profiles_sample_rate=read_float_env(ENV_SENTRY_PROFILES_SAMPLE_RATE, 0),
            traces_sample_rate=read_float_env(ENV_SENTRY_TRACES_SAMPLE_RATE, 0),
        )
