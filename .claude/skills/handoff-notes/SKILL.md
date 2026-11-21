---
name: handoff-notes
description: Write or read a session handoff note stored in the repository, so the next Claude Code session (cloud or local) can continue the work. WRITE when the user says "session handoff", "passation", "on s'arrête là", "résume la session", "wrap up", or when the context warning appears and the user agrees. READ when the user says "resume from before", "reprends où on s'est arrêtés", "continue la session précédente", or at the start of a session when the user refers to earlier work.
---

# Handoff notes in the repository

Cloud containers are reset between sessions: only files pushed to the repository survive.
Notes live in `.claude/handoffs/YYYY-MM-DD-<topic>.md` and are committed and pushed.

## Write

Create one file per session (French, short, factual). Sections:

1. **Objectif** – what the owner wanted.
2. **Fait** – what changed, with commit hashes and file paths.
3. **Décisions** – with their reference (e.g. D56) and the reason in one line.
4. **Vérifié / non vérifié** – tests and checks run; what was not verified.
5. **Écarté** – approaches tried and rejected, and why (so they are not retried).
6. **En attente** – actions waiting for the owner (settings, secrets, approvals).
7. **Prochaine étape** – the single next action.

Then: `git add .claude/handoffs && git commit -m "docs: session handoff <topic>"` and push to
the work branches. If a lesson must apply to every future session, also add one line to
`.claude/CLAUDE.md` (Lessons or project status), not only to the note.

## Read

List `.claude/handoffs/` (newest first), read the latest note (and an older one only if
the user names it), open the files it cites, then tell the owner in a few lines where
the work stands and the proposed next step. Do not redo work marked as done or rejected.
