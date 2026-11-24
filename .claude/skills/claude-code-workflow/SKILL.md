---
name: claude-code-workflow
description: How to run Claude Code sessions well and how to set up a repository for it - planning, context limits, sessions, CLAUDE.md, rules, skills, subagents, hooks, permissions, PR habits. Use when the user asks how to work better with Claude Code, why a long session degrades, how to write or organise CLAUDE.md, skills, commands or hooks, how to reduce permission prompts, or when you create a new skill. Distilled from shanraisshan/claude-code-best-practice (MIT), which collects tips from the Claude Code team and community.
---

# Claude Code workflow

## Planning

- Start non-trivial work with a plan. For a vague request, interview the user first,
  then execute the agreed spec.
- Plan in phases with a gate (tests) at the end of each phase.
- Slice work vertically: one thin feature through all layers (database → service → UI)
  before widening. Horizontal phases (all database, then all API) delay the first real
  end-to-end check.
- For cheap work, several quick prototypes beat a long spec.
- Have a second, independent context review a plan or a diff: a model does not reliably
  find its own mistakes.

## Context

- Quality drops well before the window is full. Treat ~40 % usage as a warning and plan a
  wrap-up beyond ~60 % for demanding work.
- After a failed attempt, go back (rewind) and re-prompt with what was learned, instead of
  stacking corrections on top of the failure.
- Compact with an explicit focus ("keep the auth refactor, drop the test debugging")
  rather than waiting for automatic compaction.
- Send exploration to a subagent when only its conclusion is needed: the 20 reads and dead
  ends stay in the child context.
- New task → new session. Related follow-up → same session.
- Before a reset, write a handoff note: goal, state, decisions, open items, next step.

## CLAUDE.md and rules

- Keep each CLAUDE.md short (under ~200 lines). It must contain the commands to set up,
  build and test: "run the tests" must work on the first try.
- Split large instructions into `.claude/rules/*.md`; use `paths:` frontmatter so a rule
  loads only when matching files are touched.
- Use settings (permissions, attribution, model) for behaviour that must be enforced;
  CLAUDE.md is advice, settings are guarantees.
- Finish migrations: a half-migrated codebase makes the model copy the wrong pattern.

## Skills (also follow this when writing one)

- A skill is a folder: `SKILL.md` plus `references/`, `scripts/`, `examples/` loaded on
  demand.
- The `description` is a trigger for the model ("when should I fire?"), not a summary.
  Put the user's own words and synonyms in it.
- Do not state the obvious. Write only what changes default behaviour.
- Give goals and constraints, not a rigid step list.
- Add a **Gotchas** section and grow it each time the model fails in this domain.
- Ship scripts so the model composes instead of rebuilding boilerplate.
- `context: fork` runs a skill in an isolated subagent; only its result comes back.
- Anything done more than once a day deserves a skill or a slash command.

## Subagents and parallel work

- Prefer feature-specific subagents with skills over generic roles ("backend engineer").
- Separate contexts help quality: one agent writes, another (same model) checks.
- Parallel work: git worktrees, one session per worktree, each session named.

## Hooks and permissions

- PostToolUse hook to auto-format; Stop hook to make the model verify before ending a turn.
- Narrow permission wildcards (`Bash(npm run *)`, `Edit(/docs/**)`) or sandbox / auto
  mode instead of skipping all permission checks.
- Measure which skills fire (PreToolUse hook) to find unused or under-triggering skills.

## Git and PRs

- Small PRs, one feature each (the Claude Code team's median is about 120 lines).
- Commit as soon as a step works; at least once an hour.
- Squash-merge for a linear history that is easy to revert and bisect.
- Turn recurring review comments into lint rules.

## Prompting

- Ask for proof: "show me this works", "diff against main and explain".
- After a mediocre fix: "knowing what you know now, scrap this and implement the clean
  solution".
- For a plain bug, paste it and say "fix"; do not micromanage the method.

## Gotchas

- Cloud sessions are ephemeral: only what is committed and pushed survives.
- A skill copied from the internet is code and instructions you execute: read it, check
  its licence and scan it for hidden instructions before installing.
- More tips: `references/boris-cherny-tips.md` holds 153 public tips from the creator of
  Claude Code (MIT, copied 2026-11-16). Search it by theme; check a tip against the current
  docs before you apply it, because some tips are older than the product.
