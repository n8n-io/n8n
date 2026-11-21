# CLAUDE.md

**The main checkout is a live folder.** The maintainer's machine installs the `session-handoff` plugin from the main checkout of this repo (a local-directory marketplace). Claude Code copies what is checked out there into `~/.claude/plugins/cache/session-handoff/session-handoff/<commit>/` and runs that copy, so the main checkout is what every update ships.

- Never edit, commit on, or switch branches in the main folder. Every change, even a doc typo, happens on a branch in a worktree under `.claude/worktrees/`, and only finished, tested work is merged into `master`.
- Before merging, run the tests from the worktree: `python hooks/test_context_warn.py && python hooks/test_handoff_task.py && python hooks/test_chapters.py && python hooks/test_handoff_save.py` (each prints `ok`), `claude plugin test mods/handoff-buttons` and `claude plugin validate mods/handoff-buttons` (the optional mod; its `THRESHOLD_TOKENS` must match `hooks/context-threshold-warn.py`), and `claude plugin validate .` (only the missing-`version` warnings and the `CLAUDE.md at the plugin root is not loaded as project context` warning are expected).
- Any change under `mods/handoff-buttons/` bumps the `version` in its `.claude-plugin/plugin.json`. The mod has a fixed version, so Claude Code keeps the installed copy until that number changes; the main plugin has none and is tracked by commit.
- After merging, run `claude plugin update session-handoff@session-handoff` (and `claude plugin update handoff-buttons@session-handoff` when the mod changed) so the maintainer's machine picks up the merge from the next session on. Their lookup allow rule is `Bash(chapter-index:*)`, which names no folder, so it needs no change after an update.

## Findings from Knowledge-Scout

`C:\Users\david\repos\Knowledge-Scout\reviews\session-handoff-handover.md` lists review findings for this plugin. When starting design or feature work, check it for unticked `- [ ]` lines. For each one handled, change it to `[x]` and add ` — done YYYY-MM-DD: <what happened>` or ` — declined: <why>` to the end of the line. Never delete a line. The linked report holds the full reasoning.
