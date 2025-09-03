import os
from dataclasses import dataclass
from typing import Set

from src.constants import (
    BUILTINS_DENY_DEFAULT,
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_MAX_PAYLOAD_SIZE,
    DEFAULT_TASK_BROKER_URI,
    DEFAULT_TASK_TIMEOUT,
    DEFAULT_AUTO_SHUTDOWN_TIMEOUT,
    DEFAULT_SHUTDOWN_TIMEOUT,
    ENV_BUILTINS_DENY,
    ENV_EXTERNAL_ALLOW,
    ENV_GRANT_TOKEN,
    ENV_MAX_CONCURRENCY,
    ENV_MAX_PAYLOAD_SIZE,
    ENV_STDLIB_ALLOW,
    ENV_TASK_BROKER_URI,
    ENV_TASK_TIMEOUT,
    ENV_AUTO_SHUTDOWN_TIMEOUT,
    ENV_GRACEFUL_SHUTDOWN_TIMEOUT,
)


def parse_allowlist(allowlist_str: str, list_name: str) -> Set[str]:
    if not allowlist_str:
        return set()

    modules = {
        module
        for raw_module in allowlist_str.split(",")
        if (module := raw_module.strip())
    }

    if "*" in modules and len(modules) > 1:
        raise ValueError(
            f"Wildcard '*' in {list_name} must be used alone, not with other modules. "
            f"Got: {', '.join(sorted(modules))}"
        )

    return modules


@dataclass
class TaskRunnerConfig:
    grant_token: str
    task_broker_uri: str
    max_concurrency: int
    max_payload_size: int
    task_timeout: int
    auto_shutdown_timeout: int
    graceful_shutdown_timeout: int
    stdlib_allow: Set[str]
    external_allow: Set[str]
    builtins_deny: Set[str]

    @property
    def is_auto_shutdown_enabled(self) -> bool:
        return self.auto_shutdown_timeout > 0

    @classmethod
    def from_env(cls):
        grant_token = os.getenv(ENV_GRANT_TOKEN, "")
        if not grant_token:
            raise ValueError("Environment variable N8N_RUNNERS_GRANT_TOKEN is required")

        task_timeout = int(os.getenv(ENV_TASK_TIMEOUT, DEFAULT_TASK_TIMEOUT))
        if task_timeout <= 0:
            raise ValueError(f"Task timeout must be positive, got {task_timeout}")

        auto_shutdown_timeout = int(
            os.getenv(ENV_AUTO_SHUTDOWN_TIMEOUT, DEFAULT_AUTO_SHUTDOWN_TIMEOUT)
        )
        if auto_shutdown_timeout < 0:
            raise ValueError(
                f"Auto shutdown timeout must be non-negative, got {auto_shutdown_timeout}"
            )

        graceful_shutdown_timeout = int(
            os.getenv(ENV_GRACEFUL_SHUTDOWN_TIMEOUT, DEFAULT_SHUTDOWN_TIMEOUT)
        )
        if graceful_shutdown_timeout <= 0:
            raise ValueError(
                f"Graceful shutdown timeout must be positive, got {graceful_shutdown_timeout}"
            )

        return cls(
            grant_token=grant_token,
            task_broker_uri=os.getenv(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI),
            max_concurrency=int(
                os.getenv(ENV_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY)
            ),
            max_payload_size=int(
                os.getenv(ENV_MAX_PAYLOAD_SIZE, DEFAULT_MAX_PAYLOAD_SIZE)
            ),
            task_timeout=task_timeout,
            auto_shutdown_timeout=auto_shutdown_timeout,
            graceful_shutdown_timeout=graceful_shutdown_timeout,
            stdlib_allow=parse_allowlist(
                os.getenv(ENV_STDLIB_ALLOW, ""), ENV_STDLIB_ALLOW
            ),
            external_allow=parse_allowlist(
                os.getenv(ENV_EXTERNAL_ALLOW, ""), ENV_EXTERNAL_ALLOW
            ),
            builtins_deny=set(
                module.strip()
                for module in os.getenv(ENV_BUILTINS_DENY, BUILTINS_DENY_DEFAULT).split(
                    ","
                )
            ),
        )
