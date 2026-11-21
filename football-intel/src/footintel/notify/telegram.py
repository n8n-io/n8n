"""Telegram notifications. Disabled, with a log line, when the bot token or chat id is missing.

Not tested against the real Telegram API in development (no token was available);
covered by a unit test with a mocked transport.
"""

import logging

import httpx

from footintel.config import Settings

log = logging.getLogger(__name__)

MAX_LEN = 4000  # Telegram limit is 4096 characters per message


def _chunks(text: str) -> list[str]:
    parts, current = [], ""
    for line in text.splitlines(keepends=True):
        if len(current) + len(line) > MAX_LEN:
            parts.append(current)
            current = ""
        current += line[:MAX_LEN]
    if current.strip():
        parts.append(current)
    return parts


def send(settings: Settings, text: str, transport: httpx.BaseTransport | None = None) -> int:
    """Send `text` as one or more messages. Returns the number of messages sent."""
    token = settings.telegram_bot_token.get_secret_value() if settings.telegram_bot_token else ""
    if not token or not settings.telegram_chat_id:
        log.info("Telegram not configured: notification skipped")
        return 0
    sent = 0
    with httpx.Client(timeout=settings.http_timeout_seconds, transport=transport) as client:
        for part in _chunks(text):
            r = client.post(f"https://api.telegram.org/bot{token}/sendMessage",
                            json={"chat_id": settings.telegram_chat_id, "text": part,
                                  "disable_web_page_preview": True})
            if r.status_code != 200:
                # The URL holds the token: never log it.
                log.error("Telegram answered HTTP %s: %s", r.status_code, r.text[:200])
                break
            sent += 1
    return sent


def summary_from_markdown(md: str, max_lines: int = 40) -> str:
    """Plain-text digest of a report: headings and list lines, tables dropped."""
    keep = []
    for line in md.splitlines():
        if line.startswith("|") or not line.strip():
            continue
        keep.append(line.lstrip("#> ").strip())
        if len(keep) >= max_lines:
            keep.append("…")
            break
    return "\n".join(keep)
