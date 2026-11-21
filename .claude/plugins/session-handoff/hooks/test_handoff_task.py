"""Self-check for context-threshold-handoff-task.py. Run: python hooks/test_handoff_task.py"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HOOK = Path(__file__).with_name("context-threshold-handoff-task.py")


def transcript(path, tokens):
    usage = {"input_tokens": tokens, "output_tokens": 0}
    path.write_text(json.dumps({"message": {"role": "assistant", "usage": usage}}) + "\n", encoding="utf-8")


def run(tool_name, transcript_path):
    payload = {"tool_name": tool_name, "transcript_path": str(transcript_path)}
    return subprocess.run(
        [sys.executable, str(HOOK)], input=json.dumps(payload),
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


with tempfile.TemporaryDirectory() as tmp:
    big, small, edge = Path(tmp) / "big.jsonl", Path(tmp) / "small.jsonl", Path(tmp) / "edge.jsonl"
    transcript(big, 150_000)
    transcript(small, 10_000)
    transcript(edge, 149_999)

    # The subagent tool is called "Agent" now; older Claude Code called it "Task". Both must warn.
    for name in ("Agent", "Task"):
        r = run(name, big)
        assert r.returncode == 0, r
        out = json.loads(r.stdout)["hookSpecificOutput"]
        assert out["hookEventName"] == "PreToolUse", out
        assert "150k tokens" in out["additionalContext"], out

    # Below the threshold: silent, right up to the line.
    for path in (small, edge):
        r = run("Agent", path)
        assert r.returncode == 0 and r.stdout == "", (path.name, r)

print("ok")
