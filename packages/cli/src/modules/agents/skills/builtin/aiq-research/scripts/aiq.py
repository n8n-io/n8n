#!/usr/bin/env python3
# SPDX-FileCopyrightText: Copyright (c) 2025-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Local AIQ Research API client.

This helper assumes a local AIQ server running with REQUIRE_AUTH=false.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterator
from typing import Any

_CONTROL_CHAR_RE = re.compile(r"[\x00-\x1f\x7f]")
_JOB_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_CHAT_JOB_ID_RE = re.compile(r"Job ID:\s*([0-9a-f-]{36})", re.IGNORECASE)
_AGENT_TYPE_RE = re.compile(r"^[a-zA-Z0-9_.-]{1,128}$")
_ALLOWED_METHODS = frozenset({"GET", "POST"})
_LOCAL_BACKEND_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "host.docker.internal"})
_DONE_JOB_STATES = frozenset({"completed", "success", "failed", "cancelled", "failure"})
_SUCCESS_JOB_STATES = frozenset({"completed", "success"})
_FAILED_JOB_STATES = frozenset({"failed", "failure", "cancelled"})
_STREAM_TERMINAL_EVENTS = frozenset({"complete", "error", "done"})

DEFAULT_SERVER_URL = "http://localhost:8000"
AIQ_SERVER_URL = os.environ.get("AIQ_SERVER_URL", DEFAULT_SERVER_URL)
DEFAULT_AGENT_TYPE = "shallow_researcher"
_HEADLESS_HEADERS = {"Content-Type": "application/json", "X-AIQ-Mode": "headless"}

URL_MAX_LENGTH = 2048
API_PATH_MAX_LENGTH = 4096
ERROR_BODY_PREVIEW_CHARS = 1000
HEALTH_TIMEOUT_SECONDS = 10
DEFAULT_API_TIMEOUT_SECONDS = 120
DEFAULT_LONG_HTTP_TIMEOUT_SECONDS = 3600
JOB_POLL_INTERVAL_SECONDS = 15
STATUS_CHECK_MAX_ATTEMPTS = 3
POLL_MAX_CONSECUTIVE_ERRORS = 3
JSON_INDENT_SPACES = 2
EXIT_FAILURE = 1


def _validate_base_url(url: str) -> str:
    """Validate and normalize the configured AI-Q server base URL."""
    raw = (url or "").strip()
    if not raw:
        raise RuntimeError("AIQ_SERVER_URL is empty")
    if len(raw) > URL_MAX_LENGTH or _CONTROL_CHAR_RE.search(raw):
        raise RuntimeError("AIQ_SERVER_URL is invalid")
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise RuntimeError("AIQ_SERVER_URL must be an http or https URL with a host")
    if parsed.username is not None or parsed.password is not None:
        raise RuntimeError("AIQ_SERVER_URL must not include user:password@")
    if parsed.scheme == "http" and parsed.hostname not in _LOCAL_BACKEND_HOSTS:
        raise RuntimeError("Non-local AIQ_SERVER_URL values must use https")
    return raw.rstrip("/")


def _show_query_target(api_path: str) -> None:
    """Disclose the destination before transmitting user-provided query text."""
    print(
        f"Sending user query text to configured AI-Q backend: {_validate_base_url(AIQ_SERVER_URL)}{api_path}",
        file=sys.stderr,
    )


def _validate_api_path(path: str) -> None:
    """Reject unsafe or malformed API paths before building a request URL."""
    if not path.startswith("/") or path.startswith("//"):
        raise RuntimeError("Invalid API path")
    if len(path) > API_PATH_MAX_LENGTH or ".." in path or _CONTROL_CHAR_RE.search(path):
        raise RuntimeError("Invalid API path")


def _validate_job_id(job_id: str) -> str:
    value = job_id.strip()
    if not _JOB_UUID_RE.fullmatch(value):
        raise RuntimeError("job_id must be a UUID")
    return value


def _validate_agent_type(agent_type: str) -> str:
    value = agent_type.strip()
    if not _AGENT_TYPE_RE.fullmatch(value):
        raise RuntimeError("Invalid agent_type")
    return value


def _api_request(
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    *,
    timeout: int = DEFAULT_API_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    if method not in _ALLOWED_METHODS:
        raise RuntimeError(f"Unsupported HTTP method: {method!r}")
    _validate_api_path(path)

    url = f"{_validate_base_url(AIQ_SERVER_URL)}{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    request_payload: dict[str, Any] = {"url": url, "method": method}
    if method == "POST":
        request_payload["headers"] = dict(_HEADLESS_HEADERS)
        request_payload["data"] = data
    req = urllib.request.Request(**request_payload)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP {exc.code}: {error_body[:ERROR_BODY_PREVIEW_CHARS]}", file=sys.stderr)
        raise RuntimeError(f"HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        print(f"Connection failed for {url}: {exc.reason}", file=sys.stderr)
        raise RuntimeError(f"Connection failed: {exc.reason}") from exc

    if not payload:
        return {}
    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON in API response: {payload[:ERROR_BODY_PREVIEW_CHARS]!r}", file=sys.stderr)
        raise RuntimeError(f"Invalid JSON in API response: {exc}") from exc


def _stream_request(path: str, *, timeout: int = DEFAULT_LONG_HTTP_TIMEOUT_SECONDS) -> Iterator[str]:
    _validate_api_path(path)
    url = f"{_validate_base_url(AIQ_SERVER_URL)}{path}"
    req = urllib.request.Request(url, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for raw_line in resp:
                yield raw_line.decode("utf-8", errors="replace").strip()
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP {exc.code}: {error_body[:ERROR_BODY_PREVIEW_CHARS]}", file=sys.stderr)
        raise RuntimeError(f"HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        print(f"Connection failed for {url}: {exc.reason}", file=sys.stderr)
        raise RuntimeError(f"Connection failed: {exc.reason}") from exc


def health() -> dict[str, Any]:
    for path in ("/health", "/v1/health"):
        try:
            return _api_request("GET", path, timeout=HEALTH_TIMEOUT_SECONDS)
        except RuntimeError:
            continue
    return _api_request("GET", "/", timeout=HEALTH_TIMEOUT_SECONDS)


def list_agents() -> dict[str, Any]:
    return _api_request("GET", "/v1/jobs/async/agents")


def submit_job(query: str, agent_type: str = DEFAULT_AGENT_TYPE) -> dict[str, Any]:
    body = {"agent_type": _validate_agent_type(agent_type), "input": query}
    _show_query_target("/v1/jobs/async/submit")
    return _api_request("POST", "/v1/jobs/async/submit", body=body, timeout=DEFAULT_LONG_HTTP_TIMEOUT_SECONDS)


def get_job_status(job_id: str) -> dict[str, Any]:
    return _api_request("GET", f"/v1/jobs/async/job/{_validate_job_id(job_id)}")


def get_job_state(job_id: str) -> dict[str, Any]:
    return _api_request("GET", f"/v1/jobs/async/job/{_validate_job_id(job_id)}/state")


def get_report(job_id: str) -> dict[str, Any]:
    return _api_request("GET", f"/v1/jobs/async/job/{_validate_job_id(job_id)}/report")


def cancel_job(job_id: str) -> dict[str, Any]:
    return _api_request("POST", f"/v1/jobs/async/job/{_validate_job_id(job_id)}/cancel")


def stream_job(job_id: str) -> None:
    for line in _stream_request(f"/v1/jobs/async/job/{_validate_job_id(job_id)}/stream"):
        if line.startswith("data:"):
            data = line[len("data:") :].strip()
            if data:
                print(data, flush=True)
        elif line.startswith("event:") and line[len("event:") :].strip() in _STREAM_TERMINAL_EVENTS:
            break


def chat_request(query: str) -> dict[str, Any]:
    body = {"messages": [{"role": "user", "content": query}]}
    _show_query_target("/chat")
    return _api_request("POST", "/chat", body=body, timeout=DEFAULT_LONG_HTTP_TIMEOUT_SECONDS)


def poll_until_complete(
    job_id: str,
    *,
    timeout: int = DEFAULT_LONG_HTTP_TIMEOUT_SECONDS,
    max_consecutive_errors: int = POLL_MAX_CONSECUTIVE_ERRORS,
) -> dict[str, Any]:
    deadline = time.time() + timeout
    consecutive_errors = 0
    while time.time() < deadline:
        try:
            status = get_job_status(job_id)
            consecutive_errors = 0
        except RuntimeError as exc:
            consecutive_errors += 1
            if consecutive_errors >= max_consecutive_errors:
                print(f"  Status check failed {consecutive_errors} times in a row: {exc}", file=sys.stderr)
                raise
            print(
                f"  Status check failed ({exc}), retrying... ({consecutive_errors}/{max_consecutive_errors})",
                file=sys.stderr,
                flush=True,
            )
            time.sleep(JOB_POLL_INTERVAL_SECONDS)
            continue

        state = status.get("status", "UNKNOWN").lower()
        if state in _DONE_JOB_STATES:
            return status
        print(f"  Status: {state}", file=sys.stderr, flush=True)
        time.sleep(JOB_POLL_INTERVAL_SECONDS)

    print("  Timed out waiting for job.", file=sys.stderr)
    return {"status": "TIMEOUT"}


def _poll_until_success_or_exit(job_id: str) -> None:
    try:
        final = poll_until_complete(job_id)
    except KeyboardInterrupt:
        print(f"\nInterrupted. Job {job_id} is still running server-side.", file=sys.stderr)
        print(f"Resume later: aiq.py research_poll {job_id}", file=sys.stderr)
        sys.exit(EXIT_FAILURE)

    if final.get("status", "").lower() not in _SUCCESS_JOB_STATES:
        print(f"Job did not complete: {final.get('status')}", file=sys.stderr)
        print(json.dumps(final, indent=JSON_INDENT_SPACES))
        sys.exit(EXIT_FAILURE)

    print(json.dumps(get_report(job_id), indent=JSON_INDENT_SPACES))


def _print_usage() -> None:
    print("Usage: aiq.py <command> [args]")
    print()
    print("Commands:")
    print("  health                        Check the local AIQ server")
    print("  chat <query>                  POST /chat, returns routed response")
    print("  agents                        List available async agent types")
    print("  submit <query> [agent_type]   Submit an async job")
    print("  status <job_id>               Job status plus /state artifacts")
    print("  state <job_id>                Event-store artifacts for one async job")
    print("  stream <job_id>               Stream SSE events from an async job")
    print("  report <job_id>               Get final report from an async job")
    print("  research <query> [agent_type] Submit async job, poll, and return report")
    print("  research_poll <job_id>        Resume polling an existing async job")
    print("  cancel <job_id>               Cancel a running job")
    print()
    print(f"Environment: AIQ_SERVER_URL defaults to {DEFAULT_SERVER_URL}")


def _require_arg(args: list[str], usage: str, *, position: int = 0) -> str:
    if len(args) <= position:
        print(usage, file=sys.stderr)
        sys.exit(EXIT_FAILURE)
    return args[position]


def _command_health(_args: list[str]) -> None:
    print(json.dumps(health(), indent=JSON_INDENT_SPACES))


def _command_chat(args: list[str]) -> None:
    query = _require_arg(args, "Usage: aiq.py chat <query>")
    result = chat_request(query)
    content = _extract_chat_content(result)
    match = _CHAT_JOB_ID_RE.search(content)
    if match:
        print(json.dumps({"status": "deep_research_running", "job_id": match.group(1)}))
        return
    print(json.dumps(result, indent=JSON_INDENT_SPACES))


def _extract_chat_content(result: dict[str, Any]) -> str:
    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return ""
    return content if isinstance(content, str) else ""


def _command_agents(_args: list[str]) -> None:
    print(json.dumps(list_agents(), indent=JSON_INDENT_SPACES))


def _command_submit(args: list[str]) -> None:
    query = _require_arg(args, "Usage: aiq.py submit <query> [agent_type]")
    agent_type = args[1] if len(args) > 1 else DEFAULT_AGENT_TYPE
    print(json.dumps(submit_job(query, agent_type=agent_type), indent=JSON_INDENT_SPACES))


def _command_status(args: list[str]) -> None:
    job_id = _require_arg(args, "Usage: aiq.py status <job_id>")
    job_status = get_job_status(job_id)
    try:
        job_state = get_job_state(job_id)
    except RuntimeError as exc:
        job_state = {"_fetch_error": str(exc)}
    print(json.dumps({"job_status": job_status, "job_state": job_state}, indent=JSON_INDENT_SPACES))


def _command_state(args: list[str]) -> None:
    job_id = _require_arg(args, "Usage: aiq.py state <job_id>")
    print(json.dumps(get_job_state(job_id), indent=JSON_INDENT_SPACES))


def _command_stream(args: list[str]) -> None:
    job_id = _require_arg(args, "Usage: aiq.py stream <job_id>")
    stream_job(job_id)


def _command_report(args: list[str]) -> None:
    job_id = _require_arg(args, "Usage: aiq.py report <job_id>")
    print(json.dumps(get_report(job_id), indent=JSON_INDENT_SPACES))


def _command_research(args: list[str]) -> None:
    query = _require_arg(args, "Usage: aiq.py research <query> [agent_type]")
    agent_type = args[1] if len(args) > 1 else DEFAULT_AGENT_TYPE
    print(f"Submitting {agent_type} job...", file=sys.stderr)
    result = submit_job(query, agent_type=agent_type)
    job_id = result.get("job_id")
    if not job_id:
        print(f"ERROR: No job_id in response: {result}", file=sys.stderr)
        sys.exit(EXIT_FAILURE)
    print(f"Job submitted: {job_id}", file=sys.stderr)
    _poll_until_success_or_exit(job_id)


def _command_research_poll(args: list[str]) -> None:
    job_id = _require_arg(args, "Usage: aiq.py research_poll <job_id>")
    status = _checked_job_status(job_id)
    state = status.get("status", "UNKNOWN").lower()
    print(f"Current status: {state}", file=sys.stderr)
    if state in _SUCCESS_JOB_STATES:
        print(json.dumps(get_report(job_id), indent=JSON_INDENT_SPACES))
    elif state in _FAILED_JOB_STATES:
        print(f"Job {job_id} ended with status: {state}", file=sys.stderr)
        print(json.dumps(status, indent=JSON_INDENT_SPACES))
        sys.exit(EXIT_FAILURE)
    else:
        print("Job still running, polling...", file=sys.stderr)
        _poll_until_success_or_exit(job_id)


def _checked_job_status(job_id: str) -> dict[str, Any]:
    for attempt in range(1, STATUS_CHECK_MAX_ATTEMPTS + 1):
        try:
            return get_job_status(job_id)
        except RuntimeError as exc:
            if attempt == STATUS_CHECK_MAX_ATTEMPTS:
                print(f"Status check failed after {STATUS_CHECK_MAX_ATTEMPTS} attempts: {exc}", file=sys.stderr)
                sys.exit(EXIT_FAILURE)
            print(
                f"Status check failed ({exc}), retrying in {JOB_POLL_INTERVAL_SECONDS}s... "
                f"({attempt}/{STATUS_CHECK_MAX_ATTEMPTS})",
                file=sys.stderr,
            )
            time.sleep(JOB_POLL_INTERVAL_SECONDS)
    raise RuntimeError("unreachable")


def _command_cancel(args: list[str]) -> None:
    job_id = _require_arg(args, "Usage: aiq.py cancel <job_id>")
    print(json.dumps(cancel_job(job_id), indent=JSON_INDENT_SPACES))


def main() -> None:
    if len(sys.argv) < 2:
        _print_usage()
        sys.exit(EXIT_FAILURE)

    cmd = sys.argv[1]
    commands = {
        "health": _command_health,
        "chat": _command_chat,
        "agents": _command_agents,
        "submit": _command_submit,
        "status": _command_status,
        "state": _command_state,
        "stream": _command_stream,
        "report": _command_report,
        "research": _command_research,
        "research_poll": _command_research_poll,
        "cancel": _command_cancel,
    }
    handler = commands.get(cmd)
    if handler is None:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        _print_usage()
        sys.exit(EXIT_FAILURE)
    try:
        handler(sys.argv[2:])
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(EXIT_FAILURE)


if __name__ == "__main__":
    main()
