import os
from typing import Set

from src.constants import (
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_TASK_TIMEOUT,
    DEFAULT_TASK_BROKER_URI,
    DEFAULT_MAX_PAYLOAD_SIZE,
    DEFAULT_DENIED_BUILTINS,
    ENV_MAX_CONCURRENCY,
    ENV_MAX_PAYLOAD_SIZE,
    ENV_TASK_BROKER_URI,
    ENV_GRANT_TOKEN,
    ENV_TASK_TIMEOUT,
    ENV_BUILTINS_DENY,
    ENV_STDLIB_ALLOW,
    ENV_EXTERNAL_ALLOW,
)
from src.task_runner import TaskRunnerOpts


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


def parse_env_vars() -> TaskRunnerOpts:
    grant_token = os.getenv(ENV_GRANT_TOKEN, "")

    if not grant_token:
        raise ValueError(f"{ENV_GRANT_TOKEN} environment variable is required")

    denied_builtins_str = os.getenv(ENV_BUILTINS_DENY, DEFAULT_DENIED_BUILTINS)
    denied_builtins = {
        name
        for raw_name in denied_builtins_str.split(",")
        if (name := raw_name.strip())
    }

    stdlib_allow_str = os.getenv(ENV_STDLIB_ALLOW, "")
    stdlib_allow = parse_allowlist(stdlib_allow_str, "stdlib allowlist")

    external_allow_str = os.getenv(ENV_EXTERNAL_ALLOW, "")
    external_allow = parse_allowlist(external_allow_str, "external allowlist")

    return TaskRunnerOpts(
        grant_token=grant_token,
        task_broker_uri=os.getenv(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI),
        max_concurrency=int(
            os.getenv(ENV_MAX_CONCURRENCY) or str(DEFAULT_MAX_CONCURRENCY)
        ),
        max_payload_size=int(
            os.getenv(ENV_MAX_PAYLOAD_SIZE) or str(DEFAULT_MAX_PAYLOAD_SIZE)
        ),
        task_timeout=int(os.getenv(ENV_TASK_TIMEOUT) or str(DEFAULT_TASK_TIMEOUT)),
        denied_builtins=denied_builtins,
        stdlib_allow=stdlib_allow,
        external_allow=external_allow,
    )
