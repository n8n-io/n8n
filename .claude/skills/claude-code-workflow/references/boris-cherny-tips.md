<!-- Source: SKZL-AI/boris-cherny-claude-code-playbook (MIT, (c) its authors), TIPS.md copied 2026-11-16. -->

# TIPS.md — Structured Tip List

> **Source of truth.** All other artifacts (`README.md`, `index.html`) derive from this file.
> **Format:** One tip per H3 block. New tips inserted by `/add-tip` or by the Routine in `routines/daily-scan.md`.
> **Last manual audit:** 2026-05-12
> **Total tips:** 165 across 21 themes
> **Schema:** see `data/tips-schema.json`

---

## 01 — Parallel Execution

### #01.01 — 5 Claudes in Parallel Terminal Tabs
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Tabs numbered 1–5. iTerm2 shows system notifications whenever a Claude needs input. Never wait on a single process.

### #01.02 — 5–10 More Claudes on claude.ai/code
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Hand off between local and web with `&` or `--teleport`. Boris starts sessions in the morning from the iOS app.

### #01.03 — 3–5 Git Worktrees, One Claude per Worktree
- **Difficulty:** Advanced
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "The single biggest productivity unlock"

Team members use shell aliases `za, zb, zc` to jump between worktrees. Some have a dedicated "Analysis Worktree" for logs/BigQuery. Boris personally uses multiple checkouts instead.

### #01.04 — `claude --worktree` (or `-w`)
- **Difficulty:** Intermediate
- **Date:** 2026-02-20
- **Source:** [X-Thread](https://x.com/bcherny/status/2025007393290272904)
- **Author:** @bcherny

Built-in worktree isolation. Name the worktree yourself or let Claude name it. With `--tmux` everything starts in a tmux session.

### #01.05 — Worktree Mode in the Desktop App
- **Difficulty:** Beginner
- **Date:** 2026-02-20
- **Source:** [X-Thread](https://x.com/bcherny/status/2025007393290272904)
- **Author:** @bcherny

Code tab → enable "worktree" checkbox. No terminal needed.

### #01.06 — Subagents with Worktree Isolation
- **Difficulty:** Advanced
- **Date:** 2026-02-20
- **Source:** [X-Thread](https://x.com/bcherny/status/2025007393290272904)
- **Author:** @bcherny

Tell Claude: "use worktrees for its agents". Great for large batched changes and migrations.

### #01.07 — `isolation: worktree` in Agent Frontmatter
- **Difficulty:** Advanced
- **Date:** 2026-02-20
- **Source:** [X-Thread](https://x.com/bcherny/status/2025007393290272904)
- **Author:** @bcherny

Run a custom subagent permanently in its own worktree. Set in the YAML frontmatter of the agent definition.

### #01.08 — Non-Git VCS via WorktreeCreate Hook
- **Difficulty:** Advanced
- **Date:** 2026-02-20
- **Source:** [X-Thread](https://x.com/bcherny/status/2025007393290272904)
- **Author:** @bcherny

Mercurial, Perforce, SVN, Jujutsu: define custom `WorktreeCreate` and `WorktreeRemove` hooks.

### #01.09 — Dozens of Claudes via Worktrees
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny
- **Quote:** "I have dozens of Claudes running at all times"

Scales from the point where tab-switching alone slows you down.

---

## 02 — Plan Mode

### #02.01 — Start Every Complex Task in Plan Mode
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Shift+Tab twice. Iterate the plan with Claude, then switch to auto-accept edits. Claude one-shots most of the time if the plan is good.

### #02.02 — "A good plan is really important"
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny
- **Quote:** "A good plan is really important"

Front-load thinking into the plan — implementation almost always follows in one shot. Reduces context consumption across the entire session.

### #02.03 — Re-plan Instead of Pushing Through Problems
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "Don't keep pushing. Switch back to plan mode and re-plan"

When something goes wrong, force a fresh context.

### #02.04 — Have a Second Claude Review as "Staff Engineer"
- **Difficulty:** Advanced
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Claude A writes the plan, Claude B reviews it with fresh context — like a senior review before coding.

### #02.05 — Use Plan Mode for Verification Steps Too
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Don't just plan the implementation — also plan "how do I verify this works."

### #02.06 — Automatic Session Names After Plan Mode
- **Difficulty:** Beginner
- **Date:** 2026-03-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2032632596572811575)
- **Author:** @bcherny

Claude derives a descriptive session name from the plan conversation. Recognizable in parallel setups.

---

## 03 — CLAUDE.md

### #03.01 — A Team-Shared CLAUDE.md, Checked into Git
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

The team contributes several times per week. Becomes a living documentation of the codebase.

### #03.02 — Add a Rule Whenever Claude Makes a Mistake
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny
- **Quote:** "Anytime we see Claude do something incorrectly we add it to the CLAUDE.md"

Core of compounding engineering.

### #03.03 — Every Team Maintains Its Own CLAUDE.md
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Cross-team CLAUDE.md ownership lies with each individual team. Local knowledge stays local.

### #03.04 — Tag @.claude in PR Comments
- **Difficulty:** Advanced
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Boris' version of Dan Shipper's "Compounding Engineering". Installed via `/install-github-action`.

### #03.05 — "Update your CLAUDE.md so you don't make that mistake again"
- **Difficulty:** Beginner
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "Update your CLAUDE.md so you don't make that mistake again"

End-of-correction prompt: lets Claude write the rule for itself.

### #03.06 — Ruthlessly Trim CLAUDE.md Over Time
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

"Keep iterating until Claude's mistake rate measurably drops." Pruning is just as important as adding.

### #03.07 — Notes Directory per Task, Referenced from CLAUDE.md
- **Difficulty:** Advanced
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

One engineer maintains a notes directory per task, updated after every PR. CLAUDE.md references it.

### #03.08 — CLAUDE.md Variants by Scope
- **Difficulty:** Intermediate
- **Date:** 2025-06-15
- **Source:** AIEWF Talk 2025
- **Author:** @bcherny

`CLAUDE.md` (project, in git), `CLAUDE.local.md` (gitignored, personal), `~/.claude/CLAUDE.md` (global), per-subfolder `a/b/CLAUDE.md` for monorepos.

### #03.09 — Memory Is Just a Markdown File
- **Difficulty:** Beginner
- **Date:** 2025-05-07
- **Source:** [Latent Space Podcast](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "It's a file that has some stuff. And it's auto-read into context"

Simpler than any vector store.

### #03.10 — Prepend `#` to Remember Something
- **Difficulty:** Beginner
- **Date:** 2025-06-15
- **Source:** AIEWF Talk 2025
- **Author:** @bcherny

"Add to Claude's memory by prepending # to something you want Claude Code to remember." Claude asks about memory location (project/user).

### #03.11 — Auto-Memory + Auto-Dream
- **Difficulty:** Advanced
- **Date:** 2026-03-25
- **Source:** [X (RT)](https://x.com/bcherny/status/2036959638646866021)
- **Author:** @thariq (RT @bcherny)

Auto-Memory saves preferences/corrections automatically. Auto-Dream is a subagent that periodically reviews and consolidates past sessions (REM sleep metaphor).

### #03.12 — Encode Domain Knowledge as Agent-Ready Artifacts
- **Difficulty:** Intermediate
- **Date:** 2026-07-15
- **Source:** [X-Thread](https://x.com/bcherny/status/2077460395279692197)
- **Author:** @bcherny
- **Quote:** "automate, and encode domain knowledge as infrastructure"

Every team should write CLAUDE.md files, REVIEW.md review guides, skills, and inline docs so agents can work in the codebase with zero additional context from the prompter. Previously, automation was limited to what lint rules, types, and tests could express; CLAUDE.md-based infrastructure can now capture nearly all domain knowledge — architecture patterns, review criteria, team conventions, and more. This is the AI-era equivalent of the automation investments that made the best engineers 10x.

### #03.13 — Reset CLAUDE.md, Skills & Hooks Every 6 Months
- **Difficulty:** Intermediate
- **Date:** 2026-07-27
- **Source:** [YC Startup School 2026](https://www.ycombinator.com/library/UN-boris-cherny-building-claude-code)
- **Author:** @bcherny
- **Quote:** "every 6 months, delete your claude.md file, delete your skills, and delete your hooks"

Every major model upgrade reduces the scaffolding Claude needs. Boris advises periodically deleting `CLAUDE.md`, skills, and hooks, then observing what the model gets right without them — and only re-adding rules where it still fails. For Opus 5 specifically, the Claude Code team stripped over 80% of their own system prompt and found the model performed better without it.

---

## 04 — Slash Commands

### #04.01 — Slash Commands for Every Inner-Loop Workflow
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Stored in `.claude/commands/`, checked into git. Claude itself can use them too.

### #04.02 — `/commit-push-pr` Dozens of Times per Day
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Inline bash for pre-computed `git status` — avoids model back-and-forth.

### #04.03 — `/feature-dev` as a Step-by-Step Guide
- **Difficulty:** Intermediate
- **Date:** 2025-11-15
- **Source:** [AI & I Podcast](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it)
- **Author:** @bcherny

"First ask me what exactly I want, build the specification, build a detailed plan, then a to-do list, walk through step-by-step."

### #04.04 — `/commit` — The Most Basic Command
- **Difficulty:** Beginner
- **Date:** 2025-11-15
- **Source:** [AI & I Podcast](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it)
- **Author:** @bcherny

Most-used slash command at Anthropic. Auto-runs save+push without permission prompts.

### #04.05 — `/code-review` on Every PR
- **Difficulty:** Intermediate
- **Date:** 2025-11-15
- **Source:** [AI & I Podcast](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it)
- **Author:** @bcherny

Human approves the merge, Claude does the first sweep. Standard in the Anthropic team.

### #04.06 — Slash Commands Are Prompts, Not Tools
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "Slash commands are actually just like prompts"

Important for the mental model.

### #04.07 — Local Commands Before MCP for Simple Cases
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"If you just want something really simple and local… just use local commands for that." Use MCP only when needed.

### #04.08 — `/init` Generates a Starter CLAUDE.md
- **Difficulty:** Beginner
- **Date:** 2025-04-18
- **Source:** [Anthropic Blog](https://code.claude.com/docs/en/best-practices)
- **Author:** @bcherny

Analyzes the codebase, detects build systems, tests, code patterns. First step in any new project.

### #04.09 — `/techdebt` Finds Duplicated Code
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Run at the end of every session. Community favorite among custom commands.

### #04.10 — Context-Dump Slash Command
- **Difficulty:** Advanced
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Syncs 7 days of Slack + GDrive + Asana + GitHub into one prompt.

### #04.11 — `/simplify` (Built-In Skill)
- **Difficulty:** Intermediate
- **Date:** 2026-02-27
- **Source:** [X-Thread](https://x.com/bcherny/status/2027534984534544489)
- **Author:** @bcherny

Parallel agents improve code quality and enforce CLAUDE.md compliance. Usage: "make this change then run /simplify".

### #04.12 — `/batch` (Built-In Skill)
- **Difficulty:** Advanced
- **Date:** 2026-02-27
- **Source:** [X-Thread](https://x.com/bcherny/status/2027534984534544489)
- **Author:** @bcherny

Interviews you, then fans out to dozens/hundreds/thousands of worktree agents. Example: "/batch migrate src/ from Solid to React".

### #04.13 — `/loop` for Recurring Local Tasks (Up to 3 Days)
- **Difficulty:** Advanced
- **Date:** 2026-03-07
- **Source:** [X-Thread](https://x.com/bcherny/status/2030193932404150413)
- **Author:** @bcherny

Boris' setup: `/loop 5m /babysit`, `/loop 30m /slack-feedback`, `/loop /post-merge-sweeper`, `/loop 1h /pr-pruner`.

### #04.14 — `/schedule` for Cloud-Based Recurring Jobs
- **Difficulty:** Advanced
- **Date:** 2026-03-23
- **Source:** [X (RT)](https://x.com/bcherny/status/2036555259997462541)
- **Author:** @noah-z (RT @bcherny)

Survives a closed laptop. The Anthropic team uses it for auto CI-failure-resolution, docs updates.

### #04.15 — `/btw` for Side-Chain Conversations
- **Difficulty:** Beginner
- **Date:** 2026-03-10
- **Source:** [X-Thread](https://x.com/bcherny/status/2031506296697131352)
- **Author:** @bcherny
- **Quote:** "I use this all the time to answer quick questions while the agent works"

Single-turn, no tool calls, full context. Built by Erik Schluntz as a side project.

### #04.16 — `/branch` + `--resume <id> --fork-session`
- **Difficulty:** Intermediate
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Fork an existing session into a branched conversation. Saves re-contextualization.

### #04.17 — `/effort` Sets Reasoning Level
- **Difficulty:** Intermediate
- **Date:** 2026-03-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2032632596572811575)
- **Author:** @bcherny

low / medium / high / xhigh / max. Boris uses xhigh for most tasks, max for the hardest ones. Max applies only to the current session; other levels are sticky.

### #04.18 — `/focus` Mode (CLI)
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny
- **Quote:** "I generally trust the model to run the right commands and edits"

Hides intermediate work, shows only the final result.

### #04.19 — `/go` — Composite Skill
- **Difficulty:** Advanced
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny
- **Quote:** "Many of my prompts look like 'Claude do blah blah /go'"

Claude tests end-to-end (Bash, Browser, or Computer Use) → runs `/simplify` → opens a PR.

### #04.20 — `/fewer-permission-prompts` Skill
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny

Scans session history for safe-but-prompted commands; recommends allowlist expansion.

### #04.21 — `/voice` Activates Voice Dictation
- **Difficulty:** Beginner
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny
- **Quote:** "I do most of my coding by speaking to Claude, rather than typing"

Hold spacebar in CLI, voice button in Desktop, iOS dictation.

### #04.22 — `/color` for Color-Coding Sessions
- **Difficulty:** Beginner
- **Date:** 2026-03-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2032632602629386348)
- **Author:** @bcherny

Makes it easier to tell parallel sessions apart.

### #04.23 — `/statusline`
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700784019452195)
- **Author:** @bcherny

Shows context %, git branch, model, cost. Everyone on the team has their own statusline.

### #04.24 — `/keybindings`
- **Difficulty:** Advanced
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700883873165435)
- **Author:** @bcherny

Every keybinding is customizable, settings live-reload. Stored in `~/.claude/keybindings.json`.

### #04.25 — `/sandbox` for Open-Source Sandbox
- **Difficulty:** Advanced
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700506465579443)
- **Author:** @bcherny

File and network isolation. Modes: BashTool auto-allow, BashTool with prompts, off.

### #04.26 — `/plugin` for Marketplace Browsing
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021699862522364149)
- **Author:** @bcherny

LSPs, MCPs, Skills, Agents, Hooks. Companies can host their own marketplace.

### #04.27 — `/agents` for Creating Custom Agents
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700144039903699)
- **Author:** @bcherny

Markdown files in `.claude/agents/`. Frontmatter configures tools/model/system prompt.

### #04.28 — `/terminal-setup` for Shift+Enter Newlines
- **Difficulty:** Beginner
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021699859359883608)
- **Author:** @bcherny

For IDE terminal, Apple Terminal, Warp, Alacritty.

### #04.29 — `/vim` for Vim-Mode Editing
- **Difficulty:** Beginner
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021699859359883608)
- **Author:** @bcherny

One-line setup. Self-explanatory for Vim users.

### #04.30 — `/teleport`
- **Difficulty:** Intermediate
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Pulls a cloud session down to your local terminal (`claude --teleport`).

### #04.31 — `/remote-control`
- **Difficulty:** Intermediate
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Controls a local session from any device. Boris has "Enable Remote Control for all sessions" in `/config`.

### #04.32 — `/compact <hint>` Instead of `/clear` Mid-Task
- **Difficulty:** Intermediate
- **Date:** 2026-04-15
- **Source:** [X (RT Thariq)](https://x.com/bcherny/status/2044548257058328723)
- **Author:** @thariq (RT @bcherny)

`/compact` is a lossy LLM summary that maintains momentum. `/clear` + briefing is hand-written context. Rule: new task = clear, related = compact.

### #04.33 — `/rewind` (or Double-Esc) Instead of Correction
- **Difficulty:** Intermediate
- **Date:** 2026-04-15
- **Source:** [X (RT Thariq)](https://x.com/bcherny/status/2044548257058328723)
- **Author:** @thariq (RT @bcherny)

Don't pollute context with failed attempts + corrections — rewind and re-prompt with what you learned.

### #04.34 — "Summarize from here" Before Rewind
- **Difficulty:** Advanced
- **Date:** 2026-04-15
- **Source:** [X (RT Thariq)](https://x.com/bcherny/status/2044548257058328723)
- **Author:** @thariq (RT @bcherny)

Have Claude write a handoff message to its future self. Maximizes continuous learning across rewinds.

### #04.35 — `/checkup` for Claude Code Health Maintenance
- **Difficulty:** Beginner
- **Date:** 2026-07-08
- **Source:** [X-Thread](https://x.com/bcherny/status/2074997570317779038)
- **Author:** @bcherny

The `/checkup` command performs a full health check on your Claude Code setup: removes unused skills, MCPs, and plugins to save context; deduplicates local `CLAUDE.md` against the checked-in version; splits an oversized root `CLAUDE.md` into nested per-folder files and skills; disables slow hooks; updates Claude Code to the latest version; enables auto mode by default; and pre-approves frequently denied read-only commands. Every proposed change is confirmed before it is applied.

---

## 05 — Subagents

### #05.01 — Subagents = Automation for PR Workflows
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Stored in `.claude/agents/`. Reusable across the team.

### #05.02 — `code-simplifier` Agent
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Cleans up code after Claude's work. Boris' standard after every implementation.

### #05.03 — `verify-app` Agent
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Detailed instructions for end-to-end testing. Verification step as a reusable building block.

### #05.04 — Append "use subagents" for More Compute
- **Difficulty:** Beginner
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

One-word escalation on any prompt. Throws more compute at the problem.

### #05.05 — Offload Tasks to Subagents to Keep Main Context Clean
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Keeps the window free for important work. Research-heavy tasks are perfect for this.

### #05.06 — 5 Parallel Exploration Agents on a New Codebase
- **Difficulty:** Advanced
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

"Use 5 subagents to explore the codebase" — runs in parallel. Fastest way to understand a new codebase.

### #05.07 — Route Permission Requests to an Opus Subagent via Hook
- **Difficulty:** Advanced
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Hook scans for prompt-injection attacks, auto-approves the safe ones. Massively reduces UI friction.

### #05.08 — Adversarial Subagent Pattern for Code Review
- **Difficulty:** Advanced
- **Date:** 2025-11-15
- **Source:** [AI & I Podcast](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it)
- **Author:** @bcherny

Boris spawns subagents for style/history/bugs as a first pass — then 5 more subagents that poke holes in the initial findings to eliminate false positives.

### #05.09 — Subagents = Uncorrelated Context Windows
- **Difficulty:** Advanced
- **Date:** 2025-11-15
- **Source:** [AI & I Podcast](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it)
- **Author:** @bcherny

The value isn't anthropomorphization — it's two context windows that know nothing of each other.

### #05.10 — Custom `--agent` Flag
- **Difficulty:** Intermediate
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

`claude --agent=ReadOnly`. Agent .md frontmatter sets name, color, tools, model, system prompt.

### #05.11 — Set a Default Agent
- **Difficulty:** Advanced
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700144039903699)
- **Author:** @bcherny

`"agent"` field in settings.json or `--agent` flag. Enforce team-specific defaults.

### #05.12 — Parallel Subagents for Plan Research
- **Difficulty:** Advanced
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "Research three separate ideas. Do it in parallel. Use three agents"

### #05.13 — Dynamic Workflows for Large-Scale Migrations
- **Difficulty:** Intermediate
- **Date:** 2026-05-28
- **Source:** [X](https://x.com/bcherny/status/2060048879274414090)
- **Author:** @bcherny
- **Quote:** "With dynamic workflows, Claude can now land that kind of work in days or weeks."

Dynamic Workflows orchestrate dozens to hundreds of subagents from a JavaScript script Claude writes automatically for your task. Include the word `workflow` anywhere in a prompt to trigger one, or activate `/effort ultracode` to have Claude plan workflows automatically for every task in the session. Best suited for codebase-wide audits, 500-file migrations, framework swaps, and API deprecations that would otherwise occupy a team for a quarter.

---

## 06 — Hooks

### #06.01 — PostToolUse Hook for Auto-Formatting
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Matcher `"Write|Edit"`, runs `bun run format || true`. Claude formats ~90% correctly; the hook catches the 10%.

### #06.02 — SessionStart Hook
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Dynamically loads context whenever Claude starts.

### #06.03 — PreToolUse Hook
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Logs every bash command. Audit trail for sensitive repos.

### #06.04 — PermissionRequest Hook
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Routes approval prompts to WhatsApp/Slack/SMS.

### #06.05 — Stop Hook Keeps Claude Running
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Pokes Claude when it stops. Can kick an agent or decide via prompt whether to continue.

### #06.06 — Agent Stop Hook for Extended Verification
- **Difficulty:** Advanced
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

More deterministic than asking Claude to verify itself.

### #06.07 — PostCompact Hook
- **Difficulty:** Advanced
- **Date:** 2026-03-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2032632602629386348)
- **Author:** @bcherny

Fires after context compression. Useful for re-injecting critical instructions.

### #06.08 — WorktreeCreate / WorktreeRemove Hooks
- **Difficulty:** Advanced
- **Date:** 2026-02-20
- **Source:** [X-Thread](https://x.com/bcherny/status/2025007393290272904)
- **Author:** @bcherny

For non-git VCS. Define worktree logic yourself.

### #06.09 — Ralph-Wiggum Plugin for Long Tasks
- **Difficulty:** Advanced
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @geoffreyhuntley (endorsed by @bcherny)

Community plugin for unattended cooking. For multi-day runs.

---

## 07 — Permissions & Safety

### #07.01 — No `--dangerously-skip-permissions` for Regular Work
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Use `/permissions` instead to pre-allow safe commands.

### #07.02 — Share `.claude/settings.json` with the Team
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Check pre-allowed permissions into git. Onboarding becomes a one-command affair.

### #07.03 — Wildcard Syntax for Permissions
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700332292911228)
- **Author:** @bcherny

`"Bash(bun run *)"`, `"Edit(/docs/**)"`. Practical for entire tool families.

### #07.04 — Auto Mode (Opus 4.7)
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny
- **Quote:** "Auto mode means no more permission prompts"

Model-based classifier auto-approves safe permission prompts. Shift+Tab cycles: Ask → Plan → Auto.

Update (2026-05-24): Boris named this his current #1 tip, framing auto mode as "the key building block for multi-clauding": start one session, then immediately start another while the first runs — no permission prompts to interrupt either. Source: [X](https://x.com/bcherny/status/2058519809214607704)

### #07.05 — `--permission-mode=dontAsk` in Sandboxes
- **Difficulty:** Advanced
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Boris uses this only in sandboxes for long runs.

### #07.06 — Activate the Open-Source Sandbox Runtime
- **Difficulty:** Advanced
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700506465579443)
- **Author:** @bcherny

Reduces prompts without `--dangerously-skip`.

### #07.07 — Permission System: Inner Workings
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021700332292911228)
- **Author:** @bcherny
- **Quote:** "Combo of prompt-injection detection, static analysis, sandboxing, and human oversight"

### #07.08 — Opus 5 + Auto Mode for Near-Zero Prompt Injection Risk
- **Difficulty:** Intermediate
- **Date:** 2026-07-24
- **Source:** [X-Thread](https://x.com/bcherny/status/2080713091688583312)
- **Author:** @bcherny
- **Quote:** "Opus 5 is our least prompt injectable model yet"

Opus 5 reduces attacker success on the Gray Swan indirect prompt injection benchmark from 5.5% (Opus 4.8) to 2.0%. When layered with prompt injection probes and Auto Mode in Claude Code, the combined defense drops the attack success rate to approximately zero — a significant security advancement Boris highlights as buried in the Opus 5 system card.

---

## 08 — MCP & Integrations

### #08.01 — Slack MCP, Checked into `.mcp.json`
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Shared with the team. Claude searches and posts autonomously.

### #08.02 — `bq` CLI for BigQuery
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "I haven't written a line of SQL in 6+ months"

### #08.03 — Sentry for Error Logs
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Pulls error logs automatically into Claude. Bug triage without context switching.

### #08.04 — Paste Slack Bug Thread → "fix"
- **Difficulty:** Beginner
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Zero context switching.

### #08.05 — Point Claude at Docker Logs
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Surprisingly strong at troubleshooting distributed systems.

### #08.06 — Slack MCP for Daily Summaries
- **Difficulty:** Intermediate
- **Date:** 2026-03-07
- **Source:** [X-Thread](https://x.com/bcherny/status/2030193932404150413)
- **Author:** @bcherny

`/loop every morning use the Slack MCP to give me a summary of top posts I was tagged in`.

### #08.07 — iMessage as a Claude Code Channel
- **Difficulty:** Beginner
- **Date:** 2026-03-25
- **Source:** [X-Thread](https://x.com/bcherny/status/2036959638646866021)
- **Author:** @bcherny

`/plugin install imessage@claude-plugins-official`. Text Claude from any Apple device via SMS.

---

## 09 — Model & Effort

### #09.01 — Opus 4.5 with Thinking for Everything
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny
- **Quote:** "Almost always faster in the end"

Less steering needed, better at tool use.

### #09.02 — Opus 4.6 1M as Default for Max/Team/Enterprise
- **Difficulty:** Intermediate
- **Date:** 2026-03-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2032514807388123255)
- **Author:** @bcherny

Pro/Sonnet users opt in via `/extra-usage`.

### #09.03 — Opus 4.7 Uses Adaptive Thinking
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny

The model decides for itself when thinking is useful. No more fixed budgets.

### #09.04 — "Think carefully and step-by-step" Pushes Thinking
- **Difficulty:** Beginner
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny

Or "Prioritize responding quickly" to save tokens.

### #09.05 — Ultrathink Trigger Words (Legacy)
- **Difficulty:** Intermediate
- **Date:** 2025-04-18
- **Source:** [Anthropic Blog](https://code.claude.com/docs/en/best-practices)
- **Author:** @bcherny

think < think hard < think harder < ultrathink. In CC v2 replaced by `/effort`; ultrathink remains highlighted.

### #09.06 — Opus 4.7: Shorter Responses, Less Auto-Tool-Use
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [Anthropic Docs](https://platform.claude.com/docs)
- **Author:** @bcherny

If you want length/style, say so explicitly. For refactoring across 40 files: explicitly request subagents.

### #09.07 — 4.7's Higher Fidelity to "Don't Nitpick"
- **Difficulty:** Advanced
- **Date:** 2026-04-16
- **Source:** [Anthropic Docs](https://platform.claude.com/docs)
- **Author:** @bcherny

Code review harnesses for older models may see lower recall — it's not a regression.

### #09.08 — Default Was Sonnet, Model Is Overridable
- **Difficulty:** Beginner
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"We default to Sonnet for most everything… you can override the model if you want."

### #09.09 — Write Plan/Think Instructions Directly
- **Difficulty:** Beginner
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "If you want Claude to think, just tell it to think"

---

## 10 — Verification

### #10.01 — Verification = 2–3x Quality
- **Difficulty:** Beginner
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny
- **Quote:** "Will 2–3x the quality of the final result"

The single most important tip in the entire setup.

### #10.02 — Boris' claude.ai/code Change Verification
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny
- **Quote:** "Claude tests every single change I land to claude.ai/code"

Claude opens the Chrome extension, tests every UI change, iterates until the UX is good.

### #10.03 — Verification Varies by Domain
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Bash, test suite, simulator, browser, computer use. Invest in their robustness.

### #10.04 — Backend = Run Server/Service End-to-End
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny

Make sure Claude can start your service.

### #10.05 — Frontend = Chromium Extension
- **Difficulty:** Intermediate
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Boris uses it for every web code change. More reliable than other browser MCPs.

### #10.06 — Desktop Apps = Computer Use
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Desktop app bundles automatic server start + built-in browser testing.

### #10.07 — "Grill Me on These Changes" Pattern
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "Don't make a PR until I pass your test"

### #10.08 — "Prove to Me This Works"
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny

Have Claude diff the behavior between main and your branch.

### #10.09 — After a Mediocre Fix
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "Scrap this and implement the elegant solution"

### #10.10 — Code → Screenshot → Iterate
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

Show Claude a mock, let it use Puppeteer to compare and iterate.

### #10.11 — Catch Errors Early
- **Difficulty:** Beginner
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "Better to identify that earlier and correct it earlier"

### #10.12 — Formal Verification with Lean and TLA+
- **Difficulty:** Advanced
- **Date:** 2026-09-23
- **Source:** [X-Thread](https://x.com/bcherny/status/2102543349102338309)
- **Author:** @bcherny
- **Quote:** "I used Opus 5.5 to formally verify the Claude Agent SDK using Lean"

Boris had Claude formally verify the Claude Agent SDK using the Lean proof assistant; a couple of short prompts produced 16 PRs fixing bugs and race conditions. He sometimes combines Lean with TLA+ to model data flow, concurrency, and state management, noting Claude is proficient in both even though he isn't.

### #10.13 — Performance Verification Loop: RUM + CI Ceilings
- **Difficulty:** Advanced
- **Date:** 2026-09-23
- **Source:** [X-Thread](https://x.com/bcherny/status/2102854267782705648)
- **Author:** @bcherny
- **Quote:** "Lots of juicy learnings & techniques in the blog post"

To make claude.ai and the Desktop app roughly 3x faster in a two-week sprint, Boris' team had Claude trace and reproduce reported slow paths, ship fixes as review-sized PRs behind short-lived feature flags, then verify each one against real-user-monitoring data before ratcheting down a CI performance budget to lock in the win. The loop — reproduce, fix behind a flag, verify with real data, lock in via CI — let them merge 3,000+ changes with no customer-facing rollback.

---

## 11 — Long-Running & Recaps

### #11.01 — (a) Background Agent for Self-Verification
- **Difficulty:** Intermediate
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Prompt Claude to spawn a background agent when done.

### #11.02 — (b) Agent Stop Hook for Deterministic Verification
- **Difficulty:** Advanced
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

More reliable than (a). Code, not the model, makes the decision.

### #11.03 — (c) Ralph-Wiggum Plugin
- **Difficulty:** Advanced
- **Date:** 2026-01-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2007179832300581177)
- **Author:** @bcherny

Community pattern for very long runs.

### #11.04 — Recaps for Long Sessions
- **Difficulty:** Beginner
- **Date:** 2026-04-16
- **Source:** [X-Thread](https://x.com/bcherny/status/2044847848035156457)
- **Author:** @bcherny

Brief summary of done + next. Disableable in `/config`.

### #11.05 — Routines (Research Preview)
- **Difficulty:** Advanced
- **Date:** 2026-04-14
- **Source:** [X](https://x.com/bcherny)
- **Author:** @bcherny

Schedule, GitHub event, and API triggers. Runs on Anthropic infrastructure.

### #11.06 — Cross-Session Continuity Workaround
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"Write down the state of this session into this text doc… in your new session, tell Claude to read from that doc."

---

## 12 — Prompting & Specs

### #12.01 — Delegation > Guidance (Opus 4.7)
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X (Cat Wu)](https://x.com/bcherny)
- **Author:** @catwu (endorsed by @bcherny)
- **Quote:** "Treat it like an engineer you're delegating to, not a pair programmer"

### #12.02 — Full Task Context Upfront
- **Difficulty:** Intermediate
- **Date:** 2026-04-16
- **Source:** [X (Cat Wu)](https://x.com/bcherny)
- **Author:** @catwu (endorsed by @bcherny)

Goal + constraints + acceptance criteria — all three in the first turn.

### #12.03 — Detailed Specs, Less Ambiguity
- **Difficulty:** Intermediate
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "The more specific you are, the better the output"

### #12.04 — Prototype > PRD
- **Difficulty:** Advanced
- **Date:** 2026-02-19
- **Source:** [Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny)
- **Author:** @bcherny

"There's just no way we could have shipped this if we started with static mocks and Figma or if we started with a PRD."

### #12.05 — Don't Micromanage How Claude Fixes a Bug
- **Difficulty:** Beginner
- **Date:** 2026-01-31
- **Source:** [X-Thread](https://x.com/bcherny/status/2017742741636321619)
- **Author:** @bcherny
- **Quote:** "Paste the bug, say 'fix.' Don't micromanage how"

### #12.06 — Prototypes Instead of Design Documents
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"Ask Claude Code to prototype three versions of it. Try the feature and see which one I like better."

### #12.07 — Give Outcomes and Constraints, Not Step-by-Step Instructions
- **Difficulty:** Intermediate
- **Date:** 2026-07-27
- **Source:** [YC Startup School 2026](https://www.ycombinator.com/library/UN-boris-cherny-building-claude-code)
- **Author:** @bcherny
- **Quote:** "Over-specification is the #1 experienced-engineer mistake"

Frontier models are routinely hobbled by prompts that enumerate every step rather than stating outcomes. Boris calls this gap "product overhang" — the difference between what the model can do and what overly prescriptive instructions let it do. The fix is to specify the desired result and exit criteria, not the process, and treat Claude like a capable colleague rather than a compiler.

Update (2026-10-06): Boris restated the point directly: "Talk to Claude the way you would a coworker." As models improve, elaborate scaffolding matters less — he suggests only three things are worth specifying: what you want done, how much effort to spend, and how Claude should verify it did the right thing. He demonstrated this with a casual, loosely-worded prompt asking Claude to build an interactive website companion for a podcast episode ("use lots of tokens," aim better than typical data journalism); Claude also produced the accompanying watercolor illustrations itself. ([X-Thread](https://x.com/bcherny/status/2107565388250874193), [X-Thread](https://x.com/bcherny/status/2107516876876362200))

---

## 13 — Customization

### #13.01 — Customize Spinner Verbs
- **Difficulty:** Beginner
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021701145023197516)
- **Author:** @bcherny

Star-Trek-themed example. Check settings.json into source control.

### #13.02 — Output Styles: Explanatory / Learning / Custom
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021701379409273093)
- **Author:** @bcherny

Claude explains frameworks; coaches you through changes.

### #13.03 — 37 Settings + 84 Environment Variables
- **Difficulty:** Advanced
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021701636075458648)
- **Author:** @bcherny

Use the `"env"` field in settings.json to avoid wrapper scripts.

### #13.04 — Claude Responds in Your Language
- **Difficulty:** Beginner
- **Date:** 2026-01-07
- **Source:** [X-Thread](https://x.com/bcherny/status/2009072293826453669)
- **Author:** @bcherny

Japanese, Spanish, German — any language is configurable.

### #13.05 — Check settings.json into Git
- **Difficulty:** Intermediate
- **Date:** 2026-02-11
- **Source:** [X-Thread](https://x.com/bcherny/status/2021701145023197516)
- **Author:** @bcherny

Team benefits from customizations. Support for enterprise-wide policies.

### #13.06 — NO_FLICKER Mode
- **Difficulty:** Intermediate
- **Date:** 2026-04-01
- **Source:** [X-Thread](https://x.com/bcherny/status/2037038538718667103)
- **Author:** @bcherny

Experimental renderer: no flicker/jump, mouse support. `CLAUDE_CODE_NO_FLICKER=1 claude`.

### #13.07 — Mods: Prompt-Built Customizations
- **Difficulty:** Intermediate
- **Date:** 2026-10-02
- **Source:** [X-Thread](https://x.com/bcherny/status/2105756563302723721)
- **Author:** @bcherny
- **Quote:** "Mods are absolutely insane."

Mods let you customize how Claude Code behaves and looks just by prompting it — short `TypeScript` functions hook into prompts, the UI, and actions, and can be written by hand or built by Claude itself. Since each engineer works differently, Boris frames Mods as removing the need for everyone to have an identical Claude Code experience; share a Mod with others by packaging it as a plugin.

---

## 14 — Headless / SDK

### #14.01 — `claude -p` for Non-Interactive Mode
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

Pass prompt in quotes. Pipeline-friendly.

### #14.02 — Best for Read-Only Tests
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "Where it works really well"

### #14.03 — Start Small, Then Scale
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"Start small… test on one test… iterate on your prompt. Then scale to 10."

### #14.04 — Pre-Commit Hook with `-p`
- **Difficulty:** Advanced
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"Just add a line: `claude -p` and whatever instruction you have." Keep under ~5 seconds.

### #14.05 — `--allow-tools` to Scope Permissions
- **Difficulty:** Advanced
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

Lock down specific tools for batch operations.

### #14.06 — `--bare` Flag for 10x SDK Startup
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Skips search for local CLAUDE.md/settings/MCPs.

### #14.07 — `--add-dir` (or `/add-dir`)
- **Difficulty:** Intermediate
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

Gives Claude access to additional repos.

### #14.08 — `--name "<session>"`
- **Difficulty:** Beginner
- **Date:** 2026-03-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2032632602629386348)
- **Author:** @bcherny

Human-readable session names for parallel work.

### #14.09 — `claude` Is a Unix Utility, Not a Chatbot
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

"Cat the CSV, pipe it into claude."

### #14.10 — Stack: React Ink + Commander.js + Bun
- **Difficulty:** Intermediate
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny

Transferable for building your own CLI tools.

---

## 15 — Code Review

### #15.01 — Automatic PR Review by an Agent Team
- **Difficulty:** Beginner
- **Date:** 2026-03-09
- **Source:** [X-Thread](https://x.com/bcherny/status/2031089411820228645)
- **Author:** @bcherny

Each agent focuses on different concerns (logic, security, performance), posts inline comments.

### #15.02 — Reviews Were the Bottleneck
- **Difficulty:** Beginner
- **Date:** 2026-03-09
- **Source:** [X-Thread](https://x.com/bcherny/status/2031089411820228645)
- **Author:** @bcherny
- **Quote:** "Code output per engineer is up 200% this year"

### #15.03 — Boris Used It for Weeks Before Launch
- **Difficulty:** Beginner
- **Date:** 2026-03-09
- **Source:** [X-Thread](https://x.com/bcherny/status/2031089411820228645)
- **Author:** @bcherny
- **Quote:** "It catches real bugs I wouldn't have noticed otherwise"

---

## 16 — Cost / ROI

### #16.01 — It's an ROI Question, Not a Cost Question
- **Difficulty:** Beginner
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @bcherny
- **Quote:** "An engineer 50, 70% more productive — that's worth a lot"

### #16.02 — ~$6/Day per Active User
- **Difficulty:** Beginner
- **Date:** 2025-05-07
- **Source:** [Latent Space](https://www.latent.space/p/claude-code)
- **Author:** @catwu

### #16.03 — Some Anthropic Engineers > $1,000/Month
- **Difficulty:** Beginner
- **Date:** 2025-11-15
- **Source:** [AI & I Podcast](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it)
- **Author:** @bcherny

Mainly for code migrations.

### #16.04 — Underfund Teams, Give Unlimited Tokens
- **Difficulty:** Beginner
- **Date:** 2026-02-19
- **Source:** [Lenny's Podcast](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)
- **Author:** @bcherny
- **Quote:** "Start by giving engineers as many tokens as possible"

### #16.05 — 1-Hour Prompt Cache
- **Difficulty:** Advanced
- **Date:** 2026-04-13
- **Source:** [X-Thread](https://x.com/bcherny/status/2043715713551212834)
- **Author:** @bcherny

Massive cost reduction for repeated multi-turn agent work.

### #16.06 — Measure AI Return in Engineering Hours, Not Token Burn
- **Difficulty:** Beginner
- **Date:** 2026-07-17
- **Source:** [X-Thread](https://x.com/bcherny/status/2077929379661844559)
- **Author:** @bcherny

Boris outlines four steps of team AI adoption and warns that token consumption is a proxy for activity, not return. The right question: would this task have required engineering effort without AI, and if so, how many hours would it have cost? That delta — engineering hours saved — is the true ROI; the biggest payoff comes as Claude handles background maintenance and bug-fixing autonomously.

---

## 17 — Form Factor & Workflow

### #17.01 — Claude Code Has a Mobile App
- **Difficulty:** Beginner
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny

iOS and Android. Boris writes a lot of code from the iOS app.

### #17.02 — Dispatch — Secure Remote Control
- **Difficulty:** Advanced
- **Date:** 2026-03-29
- **Source:** [X-Thread](https://x.com/bcherny/status/2038454336355999749)
- **Author:** @bcherny
- **Quote:** "When I'm not coding, I'm dispatching"

Uses MCPs/browser/computer with your permissions.

### #17.03 — VS Code / JetBrains / Cursor Extension
- **Difficulty:** Beginner
- **Date:** 2025-04-18
- **Source:** [Anthropic Docs](https://platform.claude.com/docs)
- **Author:** @bcherny

Recommended for IDE users: inline diffs, @-mentions, plan review.

### #17.04 — GitHub App / Slack App / Web
- **Difficulty:** Beginner
- **Date:** 2026-04-15
- **Source:** [Threads](https://www.threads.com/@boris_cherny)
- **Author:** @bcherny

"Every engineer is different and you can use Claude Code the way you want."

### #17.05 — 4 Modes of Using Claude Code
- **Difficulty:** Beginner
- **Date:** 2025-06-15
- **Source:** AIEWF Talk 2025
- **Author:** @bcherny

Terminal / IDE extension / GitHub app / SDK as Unix utility.

### #17.06 — Adapt the Workflow to the Task
- **Difficulty:** Intermediate
- **Date:** 2025-06-15
- **Source:** AIEWF Talk 2025
- **Author:** @bcherny

(explore › plan › confirm › code › commit) vs (tests › commit › code › iterate) vs (code › screenshot › iterate).

### #17.09 — Claude Desktop on Linux (Beta)
- **Difficulty:** Beginner
- **Date:** 2026-06-30
- **Source:** [X-Thread](https://x.com/bcherny/status/2072000214634742243)
- **Author:** @bcherny
- **Quote:** "You asked, we listened. Claude Desktop on Linux is here!"

Claude Desktop is now available in beta for Ubuntu 22.04+ and Debian 12+ (x86_64 and arm64) via an official apt repository. Linux users get the full Chat, Cowork, and Claude Code experience — parallel sessions, visual diff review, integrated terminal/editor, and live app preview — without relying on community workarounds. Computer Use and voice dictation are not yet included in the Linux beta.

last_scan_iso: "2026-11-16T13:17:36Z"
last_scan_anchor_tweet_id: "2113333859907747871"
last_verify_iso: "2026-11-15T07:11:09Z"
last_tip_id_per_theme:
  "01": 9
  "02": 6
  "03": 13
  "04": 35
  "05": 13
  "06": 9
  "07": 8
  "08": 7
  "09": 9
  "10": 13
  "11": 6
  "12": 7
  "13": 7
  "14": 10
  "15": 3
  "16": 6
  "17": 9
  "18": 3
  "19": 5
  "20": 5
  "21": 3
total_tips: 168
```

<!-- End tracking metadata -->
