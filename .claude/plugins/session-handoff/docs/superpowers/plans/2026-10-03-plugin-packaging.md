# Plugin Packaging (piece 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. (No project instruction file asks for subagent dispatch, so this runs inline in the session.)

**Goal:** Package the repo as a Claude Code plugin that is its own marketplace, and fix the subagent-boundary hook that never fires.

**Architecture:** Two manifests in `.claude-plugin/`, a `hooks/hooks.json` registering the four existing scripts via `${CLAUDE_PLUGIN_ROOT}`, plugin-relative lookup commands in the skill, and two small behaviour fixes to existing hooks. No new runtime code.

**Tech Stack:** Python 3 stdlib hooks; Claude Code 2.1.288 plugin system; plain assert-script tests (`python hooks/test_*.py`, print `ok`).

**Spec:** `docs/superpowers/specs/2026-10-02-plugin-packaging-design.md`

## Global Constraints

- Plugin and marketplace name: `session-handoff`. Nothing named `claude-*`.
- Plugin root is the repo root; marketplace entry `"source": "./"`.
- No `version` field in either manifest.
- Hooks in shell form: `python "${CLAUDE_PLUGIN_ROOT}/hooks/<script>.py"`, variable inside double quotes.
- Chapter DB stays at `~/.claude/chapter-index.db` (`CHAPTER_INDEX_DB` override only for tests).
- Do not touch `~/.claude/settings.json`, `~/.claude/hooks/` or `~/.claude/skills/` — that is piece 2.
- Tests are plain assert scripts beside the hooks, named `hooks/test_<thing>.py`, run with `python`, print `ok` on success.

## Findings that shaped this plan (live-checked 2026-10-03)

- A `PreToolUse` matcher of `Task` **does** still fire when Claude Code's subagent tool runs — `Task` is accepted as an alias. The payload's `tool_name` is `Agent`. (Scratch project, `claude -p --model haiku --setting-sources project`, hooks with matcher `Task` and matcher `Agent` both logged `Agent`.)
- So the bug is `hooks/context-threshold-handoff-task.py:64`, `if payload.get("tool_name") != "Task": return`, which makes the hook quit on every real call. David's `settings.json` needs no change. New registrations use `Agent`, the current name.

## Review Focus

- **Install path containing a space** (e.g. `C:\Users\John Smith\.claude\plugins\cache\...`): hooks and lookup commands must still run. Hooks are quoted in `hooks.json`; the skill's lookup commands get quotes too (Task 3), and the live check (Task 4) runs from a plugin copy whose path has a space.
- **Older Claude Code sending `tool_name: "Task"`**: the boundary hook must still warn. Task 1 removes the name check instead of swapping one name for another, and its test covers both names.
- **A home folder with no `~/.claude/hooks/`** (every plugin-only user): the warn hook must still run silently and not error. Task 2's test runs it with an empty fake home.
- **Old manual install and plugin both active** would save every handoff twice. Out of scope (piece 2 removes the old copies); Task 4 avoids it with `--setting-sources project`.
- **`python` missing or a Store alias on the user's machine.** Out of scope (piece 3); noted so nobody "fixes" it here.

---

### Task 1: Boundary hook fires for the `Agent` tool

**Files:**
- Create: `hooks/test_handoff_task.py`
- Modify: `hooks/context-threshold-handoff-task.py:2,8,64-65`
- Modify: `README.md:9,59,121,123`
- Modify: `docs/superpowers/specs/2026-10-02-plugin-packaging-design.md` (already done in the plan commit: matcher `Agent`, open question resolved)

**Interfaces:** none consumed; produces nothing other tasks call. The hook's stdout contract is unchanged: `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "[CONTEXT WARNING] ..."}}` or nothing.

- [ ] **Step 1: Write the failing test** — `hooks/test_handoff_task.py`:

```python
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
    big, small = Path(tmp) / "big.jsonl", Path(tmp) / "small.jsonl"
    transcript(big, 150_000)
    transcript(small, 10_000)

    # The subagent tool is called "Agent" now; older Claude Code called it "Task". Both must warn.
    for name in ("Agent", "Task"):
        r = run(name, big)
        assert r.returncode == 0, r
        out = json.loads(r.stdout)["hookSpecificOutput"]
        assert out["hookEventName"] == "PreToolUse", out
        assert "150k tokens" in out["additionalContext"], out

    # Below the threshold: silent.
    r = run("Agent", small)
    assert r.returncode == 0 and r.stdout == "", r

print("ok")
```

- [ ] **Step 2: Run it, confirm RED for the right reason**

Run: `python hooks/test_handoff_task.py`
Expected: fails at `json.loads(r.stdout)` with `JSONDecodeError` on the `"Agent"` iteration (stdout empty because the hook quit at line 64). Any other failure is noise — fix the test, not the hook.

- [ ] **Step 3: Remove the name check** in `hooks/context-threshold-handoff-task.py`. Delete lines 64–65:

```python
    if payload.get("tool_name") != "Task":
        return
```

The matcher in `hooks.json` already limits which tool calls reach the script, so the check only ever did harm. Also edit the docstring: line 2 `PreToolUse(Task) hook:` → `PreToolUse(Agent) hook:`; line 8 `at each Task spawn` → `at each subagent spawn`.

- [ ] **Step 4: Run tests, confirm GREEN**

Run: `python hooks/test_handoff_task.py && python hooks/test_chapters.py && python hooks/test_handoff_save.py`
Expected: `ok` three times.

- [ ] **Step 5: README** — `README.md`:
  - line 9: `(matcher \`Task\`)` → `(matcher \`Agent\`, the subagent tool)`
  - line 59: `"matcher": "Task",` → `"matcher": "Agent",`
  - lines 121 and 123: `PreToolUse:Task` → `PreToolUse:Agent` (both occurrences on 123 too, if more than one).

- [ ] **Step 6: Commit**

```bash
git add hooks/test_handoff_task.py hooks/context-threshold-handoff-task.py README.md
git commit -m "Fire the subagent-boundary warning for the Agent tool"
```

### Task 2: Remove the warn hook's debug dump

**Files:**
- Create: `hooks/test_context_warn.py`
- Modify: `hooks/context-threshold-warn.py:24-31,82`

**Interfaces:** none. Stdout contract unchanged: the `[CONTEXT WARNING] ...` text above threshold, nothing below.

- [ ] **Step 1: Write the failing test** — `hooks/test_context_warn.py`:

```python
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

    # Below threshold: silent.
    r = run(home, 10_000)
    assert r.returncode == 0 and r.stdout == "" and r.stderr == "", r

    # The prompt is never written to disk.
    assert list(hooks_dir.iterdir()) == [], list(hooks_dir.iterdir())

with tempfile.TemporaryDirectory() as tmp:
    # A plugin-only user has no ~/.claude/hooks/: still runs cleanly.
    r = run(Path(tmp), 150_000)
    assert r.returncode == 0 and r.stderr == "" and "[CONTEXT WARNING]" in r.stdout, r

print("ok")
```

- [ ] **Step 2: Run it, confirm RED for the right reason**

Run: `python hooks/test_context_warn.py`
Expected: `AssertionError` on the `hooks_dir.iterdir()` line, listing `context-debug.json`. If the earlier warning assertions fail instead, the fake-home setup is wrong — fix the test.

- [ ] **Step 3: Delete the dump** in `hooks/context-threshold-warn.py`: lines 24–31 (`DEBUG_PATH = ...` and the whole `dump_debug` function, plus the blank lines around them so one blank-line pair remains between `USAGE_KEYS` and `used_from_payload`), and line 82 `dump_debug(payload)` with its following blank line.

- [ ] **Step 4: Run tests, confirm GREEN**

Run: `python hooks/test_context_warn.py && python hooks/test_handoff_task.py && python hooks/test_chapters.py && python hooks/test_handoff_save.py`
Expected: `ok` four times.

- [ ] **Step 5: Commit**

```bash
git add hooks/test_context_warn.py hooks/context-threshold-warn.py
git commit -m "Stop the length-warning hook writing each prompt to disk"
```

### Task 3: Plugin manifests, hook registration, skill paths, Codex copy

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/hooks.json`, `codex/skills/session-handoff/SKILL.md`
- Modify: `skills/session-handoff/SKILL.md:20,37,79-81`, `hooks/chapters.py:26`

**Interfaces:** consumes the four existing scripts at `hooks/*.py` (unchanged CLI: `chapters.py record|list|show ID|output ID N`).

- [ ] **Step 1: Confirm RED** — `claude plugin validate .` from the worktree root. Expected: fails, no manifest found.

- [ ] **Step 2: `.claude-plugin/plugin.json`** — exactly the spec's block:

```json
{
  "name": "session-handoff",
  "description": "End-of-session handoffs saved to project memory, plus a local chapter index for looking up earlier work.",
  "author": { "name": "David Kay", "url": "https://github.com/David-E-Kay" },
  "repository": "https://github.com/David-E-Kay/claude-session-handoff",
  "keywords": ["handoff", "memory", "resume", "context"]
}
```

- [ ] **Step 3: `.claude-plugin/marketplace.json`**:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "session-handoff",
  "description": "Session handoffs and chapter-index recall for Claude Code.",
  "owner": { "name": "David Kay", "url": "https://github.com/David-E-Kay" },
  "plugins": [
    {
      "name": "session-handoff",
      "description": "End-of-session handoffs saved to project memory, plus a local chapter index for looking up earlier work.",
      "source": "./",
      "category": "productivity"
    }
  ]
}
```

- [ ] **Step 4: `hooks/hooks.json`** (matcher `Agent`, per the live finding):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [
        { "type": "command", "command": "python \"${CLAUDE_PLUGIN_ROOT}/hooks/context-threshold-warn.py\"" }
      ] }
    ],
    "PreToolUse": [
      { "matcher": "Agent", "hooks": [
        { "type": "command", "command": "python \"${CLAUDE_PLUGIN_ROOT}/hooks/context-threshold-handoff-task.py\"" }
      ] }
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "python \"${CLAUDE_PLUGIN_ROOT}/hooks/handoff-save.py\"" },
        { "type": "command", "command": "python \"${CLAUDE_PLUGIN_ROOT}/hooks/chapters.py\" record" }
      ] }
    ]
  }
}
```

- [ ] **Step 5: Skill path edits** — `skills/session-handoff/SKILL.md`:
  - line 20: ``The `context-threshold-warn.py` hook (`~/.claude/hooks/`) alerts`` → ``The plugin's `context-threshold-warn.py` hook alerts``
  - line 37: ``The `handoff-save.py` Stop hook (`~/.claude/hooks/`) runs`` → ``The plugin's `handoff-save.py` Stop hook runs``
  - lines 79–81: `python ~/.claude/hooks/chapters.py list` → `python "${CLAUDE_PLUGIN_ROOT}/hooks/chapters.py" list`; same for `show ID` and `output ID N`. Quoted so an install path with a space still works (spec amended).

  `hooks/chapters.py:26` comment: `# The fixed opening line ~/.claude/hooks/context-threshold-warn.py asks for; keep the two in sync.` → `# The fixed opening line context-threshold-warn.py asks for; keep the two in sync.`

- [ ] **Step 6: Codex copy** — `mkdir -p codex/skills/session-handoff && cp "~/.codex/skills/session-handoff/SKILL.md" codex/skills/session-handoff/SKILL.md`. Byte-for-byte copy; no edits.

- [ ] **Step 7: Validate, confirm GREEN**

Run: `claude plugin validate .` and `claude plugin validate .claude-plugin/marketplace.json`
Expected: `Validation passed`, or `passed with warnings` where the only warning is the missing `version`. Any other warning is a defect to fix now.
Run: `python -c "import json;[json.load(open(p)) for p in ('hooks/hooks.json','.claude-plugin/plugin.json','.claude-plugin/marketplace.json')];print('ok')"` and the four test scripts. Expected: `ok` each.

- [ ] **Step 8: Commit**

```bash
git add .claude-plugin hooks/hooks.json hooks/chapters.py skills/session-handoff/SKILL.md codex
git commit -m "Package the repo as the session-handoff plugin and marketplace"
```

### Task 4: Isolated live check

**Files:**
- Modify: `docs/superpowers/specs/2026-10-02-plugin-packaging-design.md` (record the `/resume-work` answer and the check's results under Verification)

Scratch work only; nothing on David's machine relies on it. `S` below is the session scratchpad directory. Use `--model haiku` throughout.

- [ ] **Step 1: Plugin copy at a path with a space** — `git archive HEAD | tar -x -C "$S/plugin copy"` (after `mkdir -p`). A scratch project folder `$S/proj` with an empty `.claude/` so `--setting-sources project` loads nothing of David's.

- [ ] **Step 2: Handoff saves + chapters record + warn hook clean.** From `$S/proj`, with `CHAPTER_INDEX_DB="$S/chapters.db"`:
  `claude -p "session handoff" --model haiku --plugin-dir "$S/plugin copy" --setting-sources project --allowedTools Skill --debug < /dev/null`
  Expected: a new `handoff-*.md` in the scratch project's memory directory under `~/.claude/projects/<scratch-slug>/memory/` (remove that scratch folder afterwards); `CHAPTER_INDEX_DB="$S/chapters.db" python "$S/plugin copy/hooks/chapters.py" list` from `$S/proj` shows one chapter; the debug output shows no error from `context-threshold-warn.py`.

- [ ] **Step 3: Lookup reaches the plugin's script.** Same flags, `--output-format stream-json --verbose`, prompt: `What did we decide in an earlier session about the plugin name? Look it up in the chapter index.` Do **not** allow Bash; a denied call still records the command. Expected: grep the output for `chapters.py`; the command names `.../plugin copy/hooks/chapters.py` in quotes, not `~/.claude/hooks/`.

- [ ] **Step 4: Bare `/resume-work`.** Run `claude -p "/resume-work" ...` and `claude -p "/session-handoff:resume-work" ...` with the same flags. Record which resolve (an unknown-command reply means no).

- [ ] **Step 5: Boundary hook in a real run.** Already proven at unit level in Task 1 plus the alias finding; no extra live run (it needs 120k tokens).

- [ ] **Step 6: Record results** in the spec's Verification section (one line each, dated), delete the scratch memory folder, commit:

```bash
git add docs/superpowers/specs/2026-10-02-plugin-packaging-design.md
git commit -m "Record the plugin live-check results"
```
