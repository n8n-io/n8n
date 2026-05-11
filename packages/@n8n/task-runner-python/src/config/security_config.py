from dataclasses import dataclass


@dataclass
class SecurityConfig:
    stdlib_allow: set[str]
    external_allow: set[str]
    builtins_deny: set[str]
    runner_env_deny: bool
