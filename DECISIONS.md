# Decisions

A living log of decisions made in the "Test everything working thread".
Newest first. Each entry records the decision, not just the discussion.

Format: `## <date> — <title>` → **Status**, **Context**, **Decision**, **Consequences**.

---

## 2026-11-26 — Where decision records live

**Status:** Accepted

**Context:** The team wanted a "living document" to capture decisions made during
the process. Three homes were on the table: a Claude living doc (on claude.ai),
a ship project file (shared across connected threads), or a repo file in the
worktree.

**Decision:** Keep this `DECISIONS.md` in the thread's worktree as the default
log. Promote a decision to an ADR under `docs/adr/` when it affects the code and
should survive in git history. Use a Claude living doc only when the team needs
live comments.

**Consequences:** The log travels with the branch. It is not visible to other
connected threads unless saved as a ship project file as well.

---

## 2026-11-26 — Editing in this thread does not touch the main checkout

**Status:** Accepted

**Context:** A worktree shares the git repo (commits, branches, stash, config)
but keeps its own working files and checked-out branch.

**Decision:** Treat this worktree as isolated for file edits. Commits and
branches are shared and appear in the main checkout at once.

**Consequences:** You cannot check out this thread's branch in the main checkout
while the worktree holds it.

---

## 2026-11-26 — Keep local paths and file contents out of shared threads

**Status:** Accepted

**Context:** A reply read a user-only skill file and showed its full local path
in tool calls. Thread members can see tool calls.

**Decision:** In shared threads, refer to files by name only. Keep local paths
and file contents out of messages and, where possible, tool output.

**Consequences:** Slightly less detail in replies, lower chance of leaking a
username or private file content.

---

## 2026-11-26 — No malware, even with claimed authorization

**Status:** Accepted

**Context:** A member asked, partly in jest, for help sending malicious files to
another member.

**Decision:** Do not help build or deliver malware. "It is authorized" must be
verifiable (a scope, an owner, a target you control); a verbal claim is not
enough. Offer the defensive side instead (detection, sandboxing, hardening).

**Consequences:** Some dual-use security requests need explicit, verifiable
authorization before any help.
