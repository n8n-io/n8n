import re
import string
from typing import Iterator

from src.constants import BLOCKED_ATTRIBUTES, BLOCKED_NAMES

_FORMATTER = string.Formatter()
_FIELD_ATTR_PATTERN = re.compile(r"\.(\w+)")
_FIELD_SUBSCRIPT_PATTERN = re.compile(r"\[(['\"]?)(\w+)\1\]")


def find_blocked_format_tokens(template: str) -> Iterator[str]:
    try:
        parsed = list(_FORMATTER.parse(template))
    except (ValueError, IndexError):
        return

    for _literal, field_name, format_spec, _conversion in parsed:
        if field_name is not None:
            for attr_match in _FIELD_ATTR_PATTERN.finditer(field_name):
                attr = attr_match.group(1)
                if attr in BLOCKED_ATTRIBUTES or attr in BLOCKED_NAMES:
                    yield attr

            for subscript_match in _FIELD_SUBSCRIPT_PATTERN.finditer(field_name):
                key = subscript_match.group(2)
                if key in BLOCKED_ATTRIBUTES or key in BLOCKED_NAMES:
                    yield key

        if format_spec:
            yield from find_blocked_format_tokens(format_spec)
