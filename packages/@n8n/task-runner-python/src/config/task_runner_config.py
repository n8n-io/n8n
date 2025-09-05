import os
from dataclasses import dataclass
from typing import Set

from src.constants import (
    BUILTINS_DENY_DEFAULT,
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_MAX_PAYLOAD_SIZE,
    DEFAULT_TASK_BROKER_URI,
    DEFAULT_TASK_TIMEOUT,
    ENV_BUILTINS_DENY,
    ENV_EXTERNAL_ALLOW,
    ENV_GRANT_TOKEN,
    ENV_MAX_CONCURRENCY,
    ENV_MAX_PAYLOAD_SIZE,
    ENV_STDLIB_ALLOW,
    ENV_TASK_BROKER_URI,
    ENV_TASK_TIMEOUT,
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
    stdlib_allow: Set[str]
    external_allow: Set[str]
    builtins_deny: Set[str]

    @classmethod
    def from_env(cls):
        grant_token = os.getenv(ENV_GRANT_TOKEN, "")
        if not grant_token:
            raise ValueError("Environment variable N8N_RUNNERS_GRANT_TOKEN is required")

        task_timeout = int(os.getenv(ENV_TASK_TIMEOUT, str(DEFAULT_TASK_TIMEOUT)))
        if task_timeout <= 0:
            raise ValueError(f"Task timeout must be positive, got {task_timeout}")

        return cls(
            grant_token=grant_token,
            task_broker_uri=os.getenv(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI),
            max_concurrency=int(
                os.getenv(ENV_MAX_CONCURRENCY, str(DEFAULT_MAX_CONCURRENCY))
            ),
            max_payload_size=int(
                os.getenv(ENV_MAX_PAYLOAD_SIZE, str(DEFAULT_MAX_PAYLOAD_SIZE))
            ),
            task_timeout=task_timeout,
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
