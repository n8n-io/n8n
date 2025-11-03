from dataclasses import dataclass

from src.env import read_bool_env, read_int_env, read_str_env
from src.errors import ConfigurationError
from src.constants import (
    BUILTINS_DENY_DEFAULT,
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_MAX_PAYLOAD_SIZE,
    DEFAULT_TASK_BROKER_URI,
    DEFAULT_TASK_TIMEOUT,
    DEFAULT_AUTO_SHUTDOWN_TIMEOUT,
    DEFAULT_SHUTDOWN_TIMEOUT,
    ENV_BLOCK_RUNNER_ENV_ACCESS,
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
    PIPE_MSG_MAX_SIZE,
    TYPICAL_PAYLOAD_RATIO,
    PARSE_THROUGHPUT_BYTES_PER_SEC,
    PIPE_READER_JOIN_TIMEOUT_SAFETY_BUFFER,
)


def parse_allowlist(allowlist_str: str, list_name: str) -> set[str]:
    if not allowlist_str:
        return set()

    modules = {
        module
        for raw_module in allowlist_str.split(",")
        if (module := raw_module.strip())
    }

    if "*" in modules and len(modules) > 1:
        raise ConfigurationError(
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
    stdlib_allow: set[str]
    external_allow: set[str]
    builtins_deny: set[str]
    env_deny: bool
    pipe_reader_timeout: float

    @property
    def is_auto_shutdown_enabled(self) -> bool:
        return self.auto_shutdown_timeout > 0

    @classmethod
    def from_env(cls):
        grant_token = read_str_env(ENV_GRANT_TOKEN, "")
        if not grant_token:
            raise ConfigurationError(
                "Environment variable N8N_RUNNERS_GRANT_TOKEN is required"
            )

        task_timeout = read_int_env(ENV_TASK_TIMEOUT, DEFAULT_TASK_TIMEOUT)
        if task_timeout <= 0:
            raise ConfigurationError(
                f"Task timeout must be positive, got {task_timeout}"
            )

        auto_shutdown_timeout = read_int_env(
            ENV_AUTO_SHUTDOWN_TIMEOUT, DEFAULT_AUTO_SHUTDOWN_TIMEOUT
        )
        if auto_shutdown_timeout < 0:
            raise ConfigurationError(
                f"Auto shutdown timeout must be non-negative, got {auto_shutdown_timeout}"
            )

        graceful_shutdown_timeout = read_int_env(
            ENV_GRACEFUL_SHUTDOWN_TIMEOUT, DEFAULT_SHUTDOWN_TIMEOUT
        )
        if graceful_shutdown_timeout <= 0:
            raise ConfigurationError(
                f"Graceful shutdown timeout must be positive, got {graceful_shutdown_timeout}"
            )

        max_payload_size = read_int_env(ENV_MAX_PAYLOAD_SIZE, DEFAULT_MAX_PAYLOAD_SIZE)
        if max_payload_size > PIPE_MSG_MAX_SIZE:
            raise ConfigurationError(
                f"Max payload size of {max_payload_size} bytes exceeds pipe message limit of {PIPE_MSG_MAX_SIZE} bytes. Reduce {ENV_MAX_PAYLOAD_SIZE}."
            )

        # Calculate pipe reader timeout based on configured max payload size (3s for default 1 GiB)
        typical_payload = max_payload_size * TYPICAL_PAYLOAD_RATIO
        pipe_reader_timeout = (
            typical_payload / PARSE_THROUGHPUT_BYTES_PER_SEC
        ) + PIPE_READER_JOIN_TIMEOUT_SAFETY_BUFFER

        return cls(
            grant_token=grant_token,
            task_broker_uri=read_str_env(ENV_TASK_BROKER_URI, DEFAULT_TASK_BROKER_URI),
            max_concurrency=read_int_env(ENV_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY),
            max_payload_size=max_payload_size,
            task_timeout=task_timeout,
            auto_shutdown_timeout=auto_shutdown_timeout,
            graceful_shutdown_timeout=graceful_shutdown_timeout,
            stdlib_allow=parse_allowlist(
                read_str_env(ENV_STDLIB_ALLOW, ""), ENV_STDLIB_ALLOW
            ),
            external_allow=parse_allowlist(
                read_str_env(ENV_EXTERNAL_ALLOW, ""), ENV_EXTERNAL_ALLOW
            ),
            builtins_deny=set(
                module.strip()
                for module in read_str_env(
                    ENV_BUILTINS_DENY, BUILTINS_DENY_DEFAULT
                ).split(",")
            ),
            env_deny=read_bool_env(ENV_BLOCK_RUNNER_ENV_ACCESS, True),
            pipe_reader_timeout=pipe_reader_timeout,
        )
