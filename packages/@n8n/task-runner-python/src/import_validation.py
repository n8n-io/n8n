import sys
from typing import Optional, Tuple

from src.config.security_config import SecurityConfig
from src.constants import ERROR_STDLIB_DISALLOWED, ERROR_EXTERNAL_DISALLOWED


def validate_module_import(
    module_path: str,
    security_config: SecurityConfig,
) -> Tuple[bool, Optional[str]]:
    stdlib_allow = security_config.stdlib_allow
    external_allow = security_config.external_allow

    module_name = module_path.split(".")[0]
    is_stdlib = module_name in sys.stdlib_module_names
    is_external = not is_stdlib

    if is_stdlib and ("*" in stdlib_allow or module_name in stdlib_allow):
        return (True, None)

    if is_external and ("*" in external_allow or module_name in external_allow):
        return (True, None)

    if is_stdlib:
        stdlib_allowed_str = ", ".join(sorted(stdlib_allow)) if stdlib_allow else "none"
        error_msg = ERROR_STDLIB_DISALLOWED.format(
            module=module_path, allowed=stdlib_allowed_str
        )
    else:
        external_allowed_str = (
            ", ".join(sorted(external_allow)) if external_allow else "none"
        )
        error_msg = ERROR_EXTERNAL_DISALLOWED.format(
            module=module_path, allowed=external_allowed_str
        )

    return (False, error_msg)
