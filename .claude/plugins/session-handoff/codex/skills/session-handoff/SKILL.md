---
name: session-handoff
description: Two directions, one Codex skill. WRITING — use when the user says "session handoff", "wrap up session", "hand off", "handoff summary", or wants a structured end-of-session summary before clearing context; writes an append-only project handoff entry to Codex memory notes and prints it, covering decisions, shipped changes, key files, running state, verification, exact strings, ruled-out approaches, deferrals, and open questions. READING — use only when the user explicitly asks to resume: "resume", "resume from before", "resume from last session", "pick up where we left off", "continue from last time", "carry on from yesterday", "catch me up", "where did we leave off", "what was I working on", "load the last handoff", or a near-equivalent. Loads the stored handoff so a fresh Codex task continues seamlessly. Do not invoke the reading half merely because a request resembles earlier work in this project.
---

# Session Handoff

Produce a repeatable end-of-session summary so the user can start a fresh Codex task without losing continuity. This is a context-handoff artifact, not a stakeholder status report. Its audience is a future instance of Codex.

## When to invoke

**To write a handoff** — the user says: "session handoff", "wrap up session", "hand off", "handoff summary", "let's wrap up", "summarize before I clear", "summarize before I start fresh", or a near-equivalent. Also invoke when the user says they are about to start a new task and asks what it needs. Follow "Writing a handoff" below.

**To read one** — the user explicitly says: "resume", "resume from before", "resume from last session", "pick up where we left off", "continue from last time", "what was I working on", or a near-equivalent. Skip straight to "Reading a handoff in a fresh task"; do not write anything first.

## Writing a handoff

1. Review the full current conversation, not just the most recent turns.
2. Pull state from the sources below, in order:
   - Plan, spec, or roadmap files referenced in this task.
   - Current task-plan or checklist state, if one was used.
   - Background processes or dev servers started in this task.
   - Files created or modified in this task.
   - Git actions taken in this task: staged files, commits, branches, pushes, or pull requests.
   - Memory files read or updated, if relevant.
   - Unresolved user questions or deferred decisions.
3. Do not audit the filesystem. This is a synthesis of what happened in this task; use targeted checks only when they materially improve accuracy.
   - One exception: carry dead ends forward. If this task began by reading a handoff, copy each of its "Tried and ruled out" entries that still applies into the new handoff, keeping its original date. Drop an entry once the work it concerns is finished or abandoned.
4. Write the handoff to the Codex project-memory log, then print the same handoff in chat.

## Codex project-memory log and index

Codex memory is not Claude's per-repository `~/.claude/projects/.../memory/` layout. Use Codex's supported append-only note log instead:

`~\.codex\memories\extensions\ad_hoc\notes\`

1. Determine the project slug: use the Git repository directory name when the task is inside a repository; otherwise use the current workspace directory name. Preserve the absolute project/workspace path in the entry so similarly named projects never collide.
2. Create one new file named `<YYYY-MM-DD-HHmmss>-session-handoff-<project-slug>.md`. The timestamp must sort newest-last alphabetically.
3. Start the file with this metadata, then place the output template below after it:

   ```markdown
   # Session handoff — <one-line title>

   - Project: `<absolute project or workspace path>`
   - Logged: `<YYYY-MM-DD HH:MM local timezone>`
   ```

4. Do not edit `~\.codex\memories\MEMORY.md`, `memory_summary.md`, or `rollout_summaries`. Codex manages those indexes. The append-only note is the durable project log and the supported path for the memory service to consolidate into its index.
5. Never edit or delete an earlier `*-session-handoff-*.md` entry. The log is history; a new handoff always creates a new file.
6. Print the same handoff body in chat so the user can read it without opening the log file.

## Reading a handoff in a fresh task

When the user explicitly asks to resume, do this before answering, exploring, or touching code:

1. Determine the current project/workspace path and project slug using the writing rule above.
2. In `~\.codex\memories\extensions\ad_hoc\notes\`, find `*-session-handoff-<project-slug>.md` entries whose `Project:` value exactly matches the current project/workspace path. Read the alphabetically last entry.
3. Read the files named under "Key files for next task", including any plan file.
4. Report the "Pick up here" line to the user in one sentence, then proceed.

If no matching handoff exists, say so plainly. Do not reconstruct one from Git history or a broad filesystem audit. Older handoffs are history: read them only when the newest entry points to them or the user asks for history.

## Output template

Use exactly this structure every time:

```markdown
# Session Handoff — <one-line title of what this task was about>

## Where it started
<2-3 sentences: what the user asked for, key framing or constraints that emerged>

## Decisions locked + what shipped
- <decision or change> — <why, and where it lives (absolute path if a file)>
- ...

## Key files for next task
- `<absolute path>` — <why the next agent should read this first>
- Plan file: `<path>` — <if a plan drove the task>
- Memory files touched: `<paths>` — <if any>

## Running state
- Background processes: <process IDs or shell context, what they are, and how to stop them> — or "none"
- Dev servers / ports: <URL and port> — or "none"
- Open worktrees / branches: <paths and branch names> — or "none"

## Verification — how to confirm things still work
- `<command>` — <expected outcome>
- ...

## Exact strings
- `<copied character for character: an unresolved error message, a constraint in the user's own words, a value or flag the next step depends on>` — <what it is and where it came from>
- ...

## Tried and ruled out
- <approach tried and abandoned> — <why it failed, so the next agent doesn't retry it> (<YYYY-MM-DD ruled out>)
- ...

## Deferred + open questions
- Deferred: <item> — <why pushed to later>
- Open: <question needing user input> — <context>

## Pick up here
<1-2 sentences: the single most likely next action for a fresh agent>
```

## Hard rules

1. Write to the Codex memory-note log and print in chat — both, every time.
2. Never invent state. If a section has nothing to report, write "none"; do not omit it.
3. Use absolute paths for local files.
4. If a plan or spec drove the task, name it first in "Key files for next task".
5. Keep the tone terse and concrete: paths, commands, decisions, and current state. No emojis, hype, or retrospective.
6. Include background-process details when any were started; otherwise write "none".
7. Resuming is opt-in by the user's phrasing, not topic similarity. The memory index must not make unrelated work load a stale handoff.
8. Copy exact strings, never reword them: error text, commands, config keys and values, and constraints the user stated, in backticks exactly as they appeared. For a long error, keep the one line that identifies it.

## Anti-patterns

- Summarizing only recent turns and calling it a handoff.
- Listing local files by relative path only.
- Skipping "Running state" because nothing is running.
- Editing compiled Codex memory indexes or rollout summaries directly.
- Editing or deleting an earlier handoff log entry.
- Adding a retrospective or a menu of next steps. Use one clear "Pick up here" line.
