"""Logging configuration. Secrets are masked before records are written."""

import logging
import re

_SECRET_PATTERNS = [
    re.compile(r"(x-apisports-key['\"]?\s*[:=]\s*['\"]?)([^'\"\s,}]+)", re.IGNORECASE),
    re.compile(r"(bot)(\d+:[A-Za-z0-9_-]{20,})"),
    re.compile(r"(token['\"]?\s*[:=]\s*['\"]?)([^'\"\s,}]+)", re.IGNORECASE),
    re.compile(r"(://[^:/\s]+:)([^@\s]+)(@)"),
]


def mask_secrets(text: str) -> str:
    for pattern in _SECRET_PATTERNS:
        if pattern.groups == 3:
            text = pattern.sub(r"\1***\3", text)
        else:
            text = pattern.sub(r"\1***", text)
    return text


class SecretMaskingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = mask_secrets(str(record.getMessage()))
        record.args = None
        return True


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    handler.addFilter(SecretMaskingFilter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    # httpx logs full URLs at INFO; keep it quiet.
    logging.getLogger("httpx").setLevel(logging.WARNING)
