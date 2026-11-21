"""Shared HTTP client: timeout, retry with exponential backoff, per-host pacing."""

import logging
import time
from urllib.parse import urlsplit

import httpx

from footintel.config import Settings

log = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class SourceUnavailable(Exception):
    """The source could not be reached or answered with an error after all retries."""


class HttpClient:
    def __init__(self, settings: Settings, headers: dict[str, str] | None = None):
        self._settings = settings
        self._last_call: dict[str, float] = {}
        self._client = httpx.Client(
            timeout=settings.http_timeout_seconds,
            follow_redirects=True,
            headers={"User-Agent": settings.user_agent, **(headers or {})},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def _pace(self, url: str) -> None:
        host = urlsplit(url).netloc
        wait = self._settings.http_min_interval_seconds - (
            time.monotonic() - self._last_call.get(host, 0.0)
        )
        if wait > 0:
            time.sleep(wait)
        self._last_call[host] = time.monotonic()

    def get(self, url: str, params: dict | None = None) -> httpx.Response:
        attempts = self._settings.http_max_retries
        last_error: str = ""
        for attempt in range(1, attempts + 1):
            self._pace(url)
            try:
                response = self._client.get(url, params=params)
            except httpx.HTTPError as exc:
                last_error = f"{type(exc).__name__}: {exc}"
            else:
                if response.status_code < 400:
                    return response
                last_error = f"HTTP {response.status_code}"
                if response.status_code not in RETRYABLE_STATUS:
                    break
            if attempt < attempts:
                delay = 2**attempt
                log.warning("GET %s failed (%s), retry %d/%d in %ds", url, last_error,
                            attempt, attempts - 1, delay)
                time.sleep(delay)
        raise SourceUnavailable(f"GET {url} failed: {last_error}")
