from typing import Set
from dataclasses import dataclass


@dataclass
class SecurityConfig:
    stdlib_allow: Set[str]
    external_allow: Set[str]
    builtins_deny: set[str]
