# claude-session-handoff

A Claude Code plugin that lets you end a session and pick it up later without losing the thread.

Long Claude Code sessions run out of room. Once the context fills up, answers get worse, and `/clear` or `/compact` throws away what Claude knew: what you decided, which files matter, what was still running, what to do next. Starting over means explaining it all again.

This plugin turns that into two phrases:

1. Near the end of a session, say **"session handoff"**. Claude writes a short, structured summary of the session, and the plugin saves it to the project's memory. You'll see `Handoff saved to …`.
2. In a fresh session, say **"resume from before"** (or type `/resume-work`). Claude reads the summary, opens the files it names, and tells you where you left off.

It also reminds you when a session reaches 150k tokens, so you hand off before quality drops. And it keeps a local record of every session (the *chapter index*), so when you later ask "what did we decide about the database last week?", Claude can find the answer even if no summary mentioned it.

## Install

Install it as a Claude Code plugin. The repo is its own plugin marketplace:

```
claude plugin marketplace add David-E-Kay/claude-session-handoff
claude plugin install session-handoff@session-handoff
```

Then start a new Claude Code session. The plugin registers its skills and hooks itself; there is nothing to copy.

**Requirements.** Claude Code and Python 3. The plugin runs `python`, or `python3` where `python` doesn't exist (as on most Macs). It only uses Python's standard library, so there is nothing to `pip install`.

**Updates.** Auto-update is off by default for marketplaces other than Anthropic's. Turn it on under `/plugin` → Marketplaces, or update by hand with `claude plugin update session-handoff@session-handoff`, then start a new session.

**Lookup approvals (optional).** When Claude looks something up in the chapter index, it runs a command called `chapter-index`, and Claude Code asks you to approve it each time. A plugin can't pre-approve its own commands. To stop the prompts, add this one rule to `permissions.allow` in `~/.claude/settings.json`:

```json
"Bash(chapter-index:*)"
```

It covers only that one command, which reads your local index and changes nothing. It names no folder, so it keeps working after plugin updates.

**Fill the chapter index from past sessions** (optional, once). The index lives at `~/.claude/chapter-index.db` whichever copy of the script writes to it, so run the import from a clone of this repo:
```
git clone https://github.com/David-E-Kay/claude-session-handoff
python claude-session-handoff/hooks/chapters.py import
```
Reads every existing transcript under `~/.claude/projects/` and records it. Safe to re-run: already-recorded material is skipped. About a minute for a few hundred sessions.

**Upgrading from the old manual install?** Remove the copies in `~/.claude/skills/session-handoff`, `~/.claude/skills/resume-work` and the four scripts in `~/.claude/hooks/`, plus their four hook entries in `~/.claude/settings.json`. Otherwise both copies run and every handoff is saved twice. Your handoffs and chapter index are not affected.

## Optional: on-screen buttons and a cache alarm

A second plugin in this repo, `handoff-buttons`, is a *mod*: it draws in Claude Code's own window instead of writing in the chat. It needs a Claude Code recent enough to load mods, so it is a separate install, and the main plugin works without it.

```
claude plugin install handoff-buttons@session-handoff
```

What it adds, above the prompt:

- **A status line**: minutes left on the prompt cache (Claude Code's short-term reuse of the conversation, which makes the next reply cheap while it lasts), context size, and your 5-hour and weekly plan use.
- **A Session handoff button** from 150k tokens, which replaces the written reminder in chat. Once the handoff is written, a **Clear** button runs `/clear`. After a clear, a **Resume** button loads the handoff.
- **A 10-minute alarm** when the cache is about to expire and the session is over 100k tokens: a pop-up, and a Windows notification card on Windows.

**Phone alerts through Discord** (optional). With the screen off, Windows files the notification card silently, so the alarm can also post to a Discord channel. The post names the session and, when Remote Control is on for it, links to it (`https://claude.ai/code/session_...`), which the Claude phone app can open. Create a webhook in the channel's settings (Integrations → Webhooks), then paste its link when you run `/plugin configure handoff-buttons@session-handoff` in Claude Code. Or add it to `~/.claude/settings.json` yourself, under the plugin's full name:

```json
"pluginConfigs": {
  "handoff-buttons@session-handoff": {
    "options": { "discordWebhook": "https://discord.com/api/webhooks/..." }
  }
},
```

Anyone with the webhook link can post to that channel, so keep it private. A laptop in standby stays online only if Windows keeps the network on in standby, which by default it does on mains power and may not on battery.

**Where an organization manages Claude Code**, two parts of the mod don't run: setting up the Resume button and cache line when a session opens, and hiding the written reminder (you'd see both the reminder and the button). The rest works.

## Usage

Two phrases, one loop.

**Ending a session** — say **"session handoff"** (or "wrap up session", "hand off"). Claude prints the handoff in chat and the `Stop` hook saves it to project memory; you'll see "Handoff saved to …". Then `/clear` or quit; nothing to copy.

Run it whenever the next thing you'd do is `/clear`, `/compact`, or close the window — and whenever the context hook nudges you at 150k. Running it more than once per session is fine.

**Starting the next one** — say **"resume from before"** (or "resume", "pick up where we left off", "continue from last time", "catch me up", "where did we leave off", "load the last handoff"). The skill reads the newest stored handoff, opens the files it names, and tells you where to pick up. Or type **/resume-work**, which always loads the last handoff.

**Asking about earlier work** — ask plainly: "what did we decide about the database last week?", "what was the error when we tried the import?". Claude checks the handoff and memory first. Only if the answer isn't there does it look in the chapter index, one step at a time, and it tells you which chapter the answer came from. Claude may also look something up on its own when it needs a specific past fact to continue, and it tells you which chapter it used.

Start unrelated work in the same repo and you say neither — nothing stale loads. See [How handoffs persist across sessions](#how-handoffs-persist-across-sessions) for why that's a phrasing decision rather than a judgment call.

## Your data stays on your machine

The plugin sends nothing anywhere. Everything it writes stays in your `~/.claude/` folder:

- **Handoffs** go to Claude Code's own per-project memory folder, `~/.claude/projects/<repo>/memory/`, as `handoff-<date>.md` files. Claude Code loads that folder's `MEMORY.md` index at the start of each session in that repo, as it always does.
- **The chapter index** is one file, `~/.claude/chapter-index.db`. It holds a plain-text copy of your prompts, Claude's replies, and a list of the actions Claude took, but not the actions' output. Treat it like Claude Code's own transcripts, which hold the same material and more. Delete the file to wipe it.
- **The optional Discord alert** (in the `handoff-buttons` mod) is the one exception: if you set a webhook, the alarm's message is posted to it, with the session's name and, when Remote Control is on, its link.
- **Optional summaries** use [Ollama](https://ollama.com), a program that runs AI models on your own computer. They're off unless you turn them on (see below). If you point `CHAPTER_OLLAMA_URL` at another computer, chapter text is sent there.

## What's inside

- **`skills/session-handoff/SKILL.md`** — writes handoffs, reads them back when you ask to resume, and looks up earlier work in the chapter index when the handoff doesn't have the answer.
- **`skills/resume-work/SKILL.md`** — the `/resume-work` shortcut.
- **`hooks/handoff-save.py`** — a `Stop` hook (it runs when Claude finishes a reply) that saves the handoff to project memory. Claude prints the handoff once in chat and the hook does the saving, so a handoff costs one reply instead of four or five. It also notes the git commit and folder you were on, and whether you had unsaved edits, so when you resume, Claude can see whether the code has changed since and rerun the handoff's checks before trusting them.
- **`hooks/context-threshold-warn.py`** — a `UserPromptSubmit` hook that nudges you to hand off once the session passes 150k tokens.
- **`hooks/context-threshold-handoff-task.py`** — a `PreToolUse` hook that catches the same threshold between subagent tasks, where no prompt of yours would trigger the hook above.
- **`hooks/chapters.py`** — a `Stop` hook that records each session into the chapter index, plus the lookup commands. See [The chapter index](#the-chapter-index).
- **`bin/chapter-index`** — the short command Claude runs for lookups, so one allow rule covers them.
- **`mods/handoff-buttons/`** — the optional mod (see [above](#optional-on-screen-buttons-and-a-cache-alarm)). Its code is `hooks/register.tsx`; `claude plugin test mods/handoff-buttons` runs its tests.

## Notes

- The 150,000-token reminder is a fixed cutoff. It doesn't adjust to your model's context window, and there is no setting to change it yet. Editing the number in the installed scripts won't last: a plugin update replaces them.
- Running the skill twice in a session is safe: it writes a new dated handoff file and repoints the single index line at it.

## How handoffs persist across sessions

Nothing to install and nothing to run. The skill writes to Claude Code's own per-project memory directory (`~/.claude/projects/<repo-slug>/memory/`, requires memory to be enabled):

- `handoff-<YYYY-MM-DD-HHMM>.md` — one immutable file per handoff. The append-only log.
- `MEMORY.md` — the index, which Claude Code loads into context at the start of every session **in that repo**. The skill keeps exactly one handoff line in it, pointing at the newest file.

So a fresh session in the repo already sees "there is a handoff, here's the one-line pick-up-here". To load the full thing, open the session with **"resume from before"** — or "resume", "pick up where we left off", "continue from last time", "catch me up", "where did we leave off". Older handoffs sit on disk, found by globbing `handoff-*.md`.

Resuming is opt-in **by phrasing, not by topic**. Ask to resume and the handoff loads; start unrelated work in the same repo and nothing stale comes with it. The distinction matters: gating on topic similarity would mean the agent judges whether your request "looks like" prior work, which is exactly the non-deterministic behavior this avoids.

That's why the `MEMORY.md` index line is deliberately descriptive rather than imperative. It names the file and shows the one-line pick-up-here (~20 tokens, always in context), but it does not tell the agent to open it. The skill's frontmatter triggers are the only gate.

This is the idea behind [OptMem](https://github.com/VictorTaelin/OptMem) — an append-only memory log plus a small budget of it read at wake time — minus the machinery. OptMem builds a binary summary tree over fixed-width records so a million memories still wake in 0.03s. A repo accumulates handoffs in the dozens, and `MEMORY.md` is already the wake read, so the tree and its compaction commands earn nothing here. If the index ever bloats, that's the point to revisit.

## How the two hooks divide the work

`UserPromptSubmit` only fires when you send a message. In a long autonomous run (subagents orchestrated with no per-task user turn) it never sees the threshold crossing until you next type. The `PreToolUse:Agent` hook fills that gap: it fires right before the orchestrator spawns the *next* subagent — the natural "between task N and N+1" boundary — and measures the main session's cumulative tokens live at that instant.

Why `PreToolUse:Agent` and not `SubagentStop`? A `SubagentStop` hook can *measure* the main context, but its output does **not** reach the orchestrator's context, so it can't deliver the warning. `PreToolUse` output (via `additionalContext`) does reach the orchestrator. So the warning rides in just before the next delegation rather than just after the last one — same boundary, and the channel that actually works.

Both hooks stay silent below the threshold: the scripts run, but they print nothing, so they inject **zero** tokens until a warning actually fires (~100 tokens when it does).

## The chapter index

A handoff is a summary written before the next question is known, so it will sometimes leave out a detail you later need. The chapter index is the backstop. After every reply, the `chapters.py` hook appends the new part of the session's transcript to `~/.claude/chapter-index.db`: one row per prompt you typed, holding Claude's replies, a numbered list of the actions it took, and any answers you gave in a question box. The raw output of those actions is never copied in; only the list of what was done. Recording costs zero Claude tokens and never slows a reply. Everything stays on your machine, alongside Claude Code's own transcripts.

Claude reads it only when the handoff and memory lack a fact, and climbs one rung at a time:

| Rung | Command | Typical size |
|---|---|---|
| 1 | Read the newest handoff | ~5k characters |
| 2 | `chapter-index list` — one line per chapter in this project | ~11k characters for 66 chapters; capped at 150 |
| 3 | `chapter-index show ID` — one chapter in full | ~4k characters (cap 6k, `--full` lifts it) |
| 4 | `chapter-index output ID N` — the raw result of action N, read back from the original transcript | ~0.4k characters (cap 3k) |

Sizes measured on 257 real sessions. The rungs are similar in size. The cost of going deeper is that each step is one more read on top of the last, so Claude stops as soon as it has the fact. Rung 4 needs the original transcript; if Claude Code has since deleted it, rung 4 says so, and rungs 2 and 3 still work.

**Optional one-line summaries.** By default each chapter's line in `list` is built from your prompt and the first sentence of Claude's reply. For a tidier line, set `CHAPTER_SUMMARY_MODEL` to a local [Ollama](https://ollama.com) model (for example `qwen2.5:1.5b-instruct`) in the `"env"` block of `~/.claude/settings.json`, and `CHAPTER_OLLAMA_URL` if Ollama isn't at `http://127.0.0.1:11434`. Nothing leaves your machine. To summarise chapters recorded before you turned it on, run `python hooks/chapters.py summarise --missing` from a clone of this repo. Start Ollama first: if it's down, the command stops after 3 chapters in a row get no answer, and says so. The `"env"` block only applies inside Claude Code, so either set `CHAPTER_SUMMARY_MODEL` in that terminal as well, or ask Claude to run the command for you.

**Checking on it now and then.** `chapters.py status` shows when it last recorded, any recent errors, and how many unrecognised message shapes are waiting. A message shape is the form a line of the transcript takes; the recorder only starts chapters at shapes it knows are typed prompts, and logs anything new instead of guessing. `chapters.py unknowns` lists them with a sample. If one is harmless, hide it with `chapters.py unknowns --mark-reviewed SHAPE`. If it should have been a prompt, that's a bug to report.

**Repair.** `chapters.py rebuild --all` re-records every session from its transcript, for example after an update changes how chapters are split. If the database is ever damaged, delete it and run `import` again. Set `CHAPTER_INDEX_DB` to keep the database somewhere else.

**For other programs.** `chapters.py summary SESSION_ID` prints the session's latest chapter as JSON, so a tool such as a dashboard can read it without opening the database.

## Credits

`skills/session-handoff/SKILL.md` credit: [Nate Herk](https://www.linkedin.com/in/nateherkelman/).

The persistence model — append-only memory log plus a small budget of it read at wake time — is borrowed from [OptMem](https://github.com/VictorTaelin/OptMem) by [Victor Taelin](https://github.com/VictorTaelin).

## Design history

`docs/superpowers/` holds the design notes and build plans behind each piece of this plugin, written as the work was done. You don't need them to use it.

## License

MIT. See [LICENSE](LICENSE).
