# Plugin packaging (piece 1) — design

Status: design approved in chat 2026-10-02.
Branch: `claude/plugin-packaging`.

## Purpose

Today, installing the handoff skill and chapter index means cloning the repo,
copying two skills and four scripts into `~/.claude/`, and hand-merging four
hook registrations into `~/.claude/settings.json`. The merge is the risky
step: a paste in the wrong place silently drops a user's other hooks or breaks
the settings file. Updates and removal are equally manual.

This piece packages the repo as a Claude Code plugin that is also its own
marketplace, so installation becomes:

```
claude plugin marketplace add David-E-Kay/claude-session-handoff
claude plugin install session-handoff@session-handoff
```

Model: `data-goblin/power-bi-agentic-development` (same marketplace-then-install
flow) and the ponytail plugin (single plugin at the repo root).

## Scope

In:
- `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`.
- `hooks/hooks.json` registering the four existing hooks.
- Path rewording in `skills/session-handoff/SKILL.md`.
- Removing the debug dump from `hooks/context-threshold-warn.py`.
- Bringing the Codex copy of the skill into the repo at `codex/skills/session-handoff/SKILL.md`.
- An isolated live check that the plugin works, before anything on David's machine relies on it.

Out (later pieces, already agreed):
- **Piece 2:** switching David's machine to the plugin — installing from the
  local repo folder as a local-directory marketplace, deleting the loose
  copies in `~/.claude/hooks/` and `~/.claude/skills/{session-handoff,resume-work}`,
  removing their four entries from `~/.claude/settings.json`, replacing the
  lookup allow rule. Until piece 2 lands, the old copies keep running.
- **Piece 3:** directory readiness — LICENSE, public README with data
  disclosure, `python` vs `python3` on macOS, Claude-Code-only surfaces,
  permission prompts after updates for GitHub installs.
- README install section rewrite. The current manual steps stay accurate
  until piece 2, and piece 3 rewrites the README for the public anyway.

## Decisions

### Name: `session-handoff`

Both the marketplace and the plugin are named `session-handoff`. Names
starting `claude-` are rejected by `claude plugin validate`. The GitHub repo
keeps its current name; only the names inside the two manifests matter for
install. Components are namespaced under the plugin name, so the skills become
`session-handoff:session-handoff` and `session-handoff:resume-work`.

### Plugin at the repo root, not in `plugins/<name>/`

Kurt's repo puts each plugin in a subfolder because it ships eleven. We ship
one, so the plugin root is the repo root and the marketplace entry uses
`"source": "./"`, as ponytail does. Anthropic's directory scan holds non-shell
hook scripts for manual review only when the plugin is a subfolder. The install
command is the same either way.

### No `version` field

Per the plugin loading reference: a `version` in `plugin.json` pins every user
to that string until the author changes it, however many commits land. With no
`version` in the manifest or the marketplace entry, a relative-path plugin in a
Git-hosted marketplace takes the commit SHA as its version, so every merge to
master is an update.

We leave `version` out. A solo maintainer merging finished work to master
treats master as the release, and a forgotten version bump would silently keep
users on old code. Trade-off: every commit, including a README typo, counts as
an update. `claude plugin validate` reports a missing `version` as a warning,
not a failure. Revisit if the project ever wants deliberate releases.

Auto-update is off by default for third-party marketplaces. Users either turn
it on under `/plugin` → Marketplaces or run `claude plugin update`. Piece 3's
README says so.

A local-directory install (piece 2, David's machine) loads the source files in
place at every session start regardless of version.

### `plugin.json` contents

```json
{
  "name": "session-handoff",
  "description": "End-of-session handoffs saved to project memory, plus a local chapter index for looking up earlier work.",
  "author": { "name": "David Kay", "url": "https://github.com/David-E-Kay" },
  "repository": "https://github.com/David-E-Kay/claude-session-handoff",
  "keywords": ["handoff", "memory", "resume", "context"]
}
```

`license` is added in piece 3 together with the LICENSE file. No `homepage`:
it must parse as a URL or the plugin fails to load, and the repository link
covers it.

### `marketplace.json` contents

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

### `hooks/hooks.json`

The same four registrations as the README's manual install and David's current
`settings.json`, with `${CLAUDE_PLUGIN_ROOT}` in place of the install folder:

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

Shell form, with the variable inside double quotes, matching the commands that
already run on David's machine (shell form runs under Git Bash on Windows).
Exec form (`command` plus `args`) was considered: it avoids quoting entirely,
but on Windows it needs `command` to resolve to a real `.exe`, and `python`
may be a Microsoft Store alias. Shell form is the proven path.

The matcher is `Agent`, the subagent tool's current name. Live check
2026-10-03: a `Task` matcher still fires (Claude Code keeps it as an alias),
but the payload's `tool_name` is `Agent`, and
`context-threshold-handoff-task.py` quit unless it saw `Task`, so the warning
never fired. Fixed by removing that check; the matcher already filters.

Unlike the manual install, the plugin makes all four hooks mandatory: the
optional `chapters.py` and `PreToolUse` entries can no longer be skipped
individually. Accepted; both stay silent until they have something to do.

### Skill path edits

`skills/session-handoff/SKILL.md`:
- Lines 79–81, the three lookup commands:
  `python ~/.claude/hooks/chapters.py list` →
  `python "${CLAUDE_PLUGIN_ROOT}/hooks/chapters.py" list` (likewise `show ID`,
  `output ID N`). Quoted so an install path containing a space still works. Spike 2026-10-02 confirmed Claude Code substitutes the
  variable in a plugin SKILL.md body, with forward slashes on Windows.
- Lines 20 and 37, which mention `~/.claude/hooks/` as where a hook lives:
  reword to "the plugin's" hook, no path.
- Lines 26, 30 and 129 (`~/.claude/plans/`, the memory directory,
  `~/.claude/handoffs/`) refer to Claude Code's own folders, not install
  paths. Unchanged.

`skills/resume-work/SKILL.md` has no paths. Unchanged.

`hooks/chapters.py` line 26 comment names `~/.claude/hooks/context-threshold-warn.py`;
reword to `context-threshold-warn.py`. Comment only.

### Remove the debug dump

`hooks/context-threshold-warn.py` writes the full `UserPromptSubmit` payload,
which includes the prompt text, to `~/.claude/hooks/context-debug.json` on every
prompt (lines 24–31 and the `dump_debug(payload)` call at line 82). Nothing
reads it. In a public plugin it would keep each user's latest prompt in a file
they don't know about, and on a plugin install `~/.claude/hooks/` usually
doesn't exist, so the write fails silently anyway. Delete `DEBUG_PATH`,
`dump_debug` and its call.

### Data locations stay put

- Chapter database stays at `~/.claude/chapter-index.db` (`DB_PATH`,
  `hooks/chapters.py:157`). `${CLAUDE_PLUGIN_DATA}` is deleted on uninstall,
  which would discard every recorded session.
- Handoffs keep going to Claude Code's per-project memory directory.

### Codex copy

`~\.codex\skills\session-handoff\SKILL.md` is copied to
`codex/skills/session-handoff/SKILL.md`. Claude Code scans only the top-level
`skills/` folder, so it never loads this copy. Storage only: Codex's own install
is untouched, and wiring Codex to the repo copy is part of the later Codex work.

## Verification

1. **Existing tests still pass:** `python hooks/test_chapters.py` and
   `python hooks/test_handoff_save.py` (plain assert scripts that print `ok`),
   before and after the changes.
2. **Manifests validate:** `claude plugin validate .` reports `Validation passed`
   or `passed with warnings` where the only warning is the missing `version`.
3. **Isolated live check.** A throwaway `claude -p` session in a scratch
   project folder, loading the plugin with `--plugin-dir <worktree>` and
   `--setting-sources project` so David's user-level hooks (the old copies)
   don't fire alongside it. `CHAPTER_INDEX_DB` points at a scratch database so
   the real one is untouched. Confirm:
   - **Handoff saves:** ask for a session handoff; a `handoff-*.md` appears in
     the scratch project's memory directory and the hook prints "Handoff saved".
   - **Chapters record:** the scratch database gains a chapter for the session.
   - **Lookup reaches the plugin's script:** the lookup command Claude runs
     names the worktree's `hooks/chapters.py`, not `~/.claude/hooks/`.
   - **`/resume-work`:** whether the bare name resolves or only
     `/session-handoff:resume-work` does. Record the answer; it decides
     whether piece 2's README text names the short or prefixed form.
   - **Context warning** cannot be triggered cheaply (it needs 120k tokens);
     its unit-level behaviour is covered by the debug-dump removal leaving the
     rest of the script unchanged. Confirm it runs without error on a normal
     prompt (no stderr in `--debug` output).

The live check needs approval for the skill and Bash tools in `-p` mode
(`--allowedTools`), as the 2026-10-02 spike found.

### Results (2026-10-03, Claude Code 2.1.288, plugin copy at a path containing a space)

- **Manifests:** both validate; the only warning is the missing `version`.
- **Handoff saves:** yes. `handoff-save.py` ran from the plugin copy and printed "Handoff saved"; the file and the `MEMORY.md` line appeared in the scratch project's memory directory.
- **Chapters record:** not observable end to end in `-p` mode. A probe hook showed the Stop payload's `transcript_path` does not exist on disk yet when Stop hooks run in `-p` mode (also with `--resume`), so `record()` correctly does nothing. The hook itself ran cleanly from the plugin path, and `chapters.py record` fed the same session's transcript by hand recorded it. Confirm in an interactive session during piece 2.
- **Lookup reaches the plugin's script:** yes. The skill handed Claude `python "<plugin copy>/hooks/chapters.py" list` with the quotes intact, and that command runs from the path with a space.
- **`/resume-work`:** both the bare name and `/session-handoff:resume-work` resolve. (Testing from Git Bash needs `MSYS_NO_PATHCONV=1`, or the shell rewrites `/resume-work` into a Windows path.)
- **Context warning:** no hook errors in the `--debug` log; `~/.claude/hooks/context-debug.json` was last written by another session running the old loose copy, not by the plugin. Unit-level behaviour is covered by `hooks/test_context_warn.py`.

## Open questions

- ~~`Task` matcher.~~ Resolved 2026-10-03, see `hooks/hooks.json` above.
- ~~Bare `/resume-work`.~~ Resolved 2026-10-03: both forms resolve.
