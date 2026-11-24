"""Self-check for context-threshold-warn.py. Run: python hooks/test_context_warn.py"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HOOK = Path(__file__).with_name("context-threshold-warn.py")


def run(home, tokens, prompt="secret prompt text"):
    # Claude Code sends no context_window field; the hook reads usage from the transcript, as it does live.
    transcript = home / f"t{tokens}.jsonl"
    usage = {"input_tokens": tokens, "output_tokens": 0}
    transcript.write_text(json.dumps({"message": {"role": "assistant", "usage": usage}}) + "\n", encoding="utf-8")
    payload = {"prompt": prompt, "transcript_path": str(transcript)}
    env = {**os.environ, "HOME": str(home), "USERPROFILE": str(home)}  # Path.home(): HOME on POSIX, USERPROFILE on Windows
    return subprocess.run(
        [sys.executable, str(HOOK)], input=json.dumps(payload), env=env,
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


with tempfile.TemporaryDirectory() as tmp:
    home = Path(tmp)
    hooks_dir = home / ".claude" / "hooks"
    hooks_dir.mkdir(parents=True)

    # Above threshold: still warns.
    r = run(home, 150_000)
    assert r.returncode == 0 and r.stderr == "", r
    assert "[CONTEXT WARNING] Context is at 150k tokens" in r.stdout, r

    # Below threshold: silent, right up to the line.
    for tokens in (10_000, 149_999):
        r = run(home, tokens)
        assert r.returncode == 0 and r.stdout == "" and r.stderr == "", (tokens, r)

    # The prompt is never written to disk.
    assert list(hooks_dir.iterdir()) == [], list(hooks_dir.iterdir())

with tempfile.TemporaryDirectory() as tmp:
    # A plugin-only user has no ~/.claude/hooks/: still runs cleanly.
    r = run(Path(tmp), 150_000)
    assert r.returncode == 0 and r.stderr == "" and "[CONTEXT WARNING]" in r.stdout, r

print("ok")
