#!/usr/bin/env python3
"""PreToolUse(Agent) hook: warn the orchestrator when main-session context has
crossed THRESHOLD_TOKENS as it's about to spawn another subagent/task.

The UserPromptSubmit sibling hook (context-threshold-warn.py) only fires on a
user prompt, so during a long autonomous multi-task run (subagents orchestrated
with no per-task user turn) it never sees the threshold crossing. This one fires
at each subagent spawn — the natural "between task N and N+1" boundary — and injects
its warning via additionalContext, the one channel that reaches the orchestrator
(SubagentStop output does not). Always exits 0 — never blocks the spawn.
"""

import json
import sys
from pathlib import Path

THRESHOLD_TOKENS = 150_000

USAGE_KEYS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)


def used_from_transcript(transcript_path: str):
    p = Path(transcript_path)
    if not p.is_file():
        return None
    last_usage = None
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            msg = obj.get("message")
            if not isinstance(msg, dict) or msg.get("role") != "assistant":
                continue
            usage = msg.get("usage")
            if isinstance(usage, dict):
                last_usage = usage
    if not last_usage:
        return None
    return sum(int(last_usage.get(k, 0) or 0) for k in USAGE_KEYS)


def emit(ctx: str):
    json.dump(
        {"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": ctx}},
        sys.stdout,
    )


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return  # fail open
    transcript_path = payload.get("transcript_path")
    if not transcript_path:
        return
    try:
        used = used_from_transcript(transcript_path)
    except Exception:
        used = None
    if used is None or used < THRESHOLD_TOKENS:
        return

    used_k = used // 1000
    threshold_k = THRESHOLD_TOKENS // 1000
    emit(
        f"[CONTEXT WARNING] Main-session context is at {used_k}k tokens used "
        f"(threshold {threshold_k}k) as you begin another delegated task. Let the "
        "current in-flight task finish, then STOP at that natural boundary instead "
        "of spawning further tasks: run the session-handoff skill and tell the user "
        "to /clear or start a fresh session before continuing the plan. Do not "
        "silently continue the remaining plan tasks past this point."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
