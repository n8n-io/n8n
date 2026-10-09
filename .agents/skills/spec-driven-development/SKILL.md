---
name: n8n:spec-driven-development
description: Keeps implementation and specs in sync. Use when working on a feature that has a spec in .agents/specs/, when the user says /spec, or when starting implementation of a documented feature. Also use when the user asks to create a spec, verify implementation against a spec, or update a spec after changes.
---

# Spec-Driven Development

Specs live in `.agents/specs/`. They are the source of truth for architectural
decisions, API contracts, and implementation scope. Implementation and specs
must stay in sync — neither leads exclusively.

## Core Loop

```
Clarify → Write spec → Implement → Verify alignment → Update spec or code → Repeat
```

## Creating a Spec

A spec is worth writing when the work is non-trivial: a new module, a new API,
a cross-package change, or anything touching `@n8n/api-types`. Skip it for
bugfixes and one-file changes.

### 1. Clarify before writing

Ambiguity resolved before the spec is cheap. The same ambiguity found during
implementation costs a rewrite. Scan the request against these categories and
mark each **Clear**, **Partial**, or **Missing**:

- **Scope** — what ships, and what is explicitly out
- **Data & contracts** — entities, API shapes, types in `@n8n/api-types`
- **Package boundaries** — which of `cli` / `core` / `workflow` / `editor-ui` /
  `nodes-base` own what, and what crosses between them
- **Persistence** — new entities or columns, and whether a migration is needed
- **Frontend surface** — new components, Pinia store changes, i18n keys
- **Failure modes** — error paths, partial failures, what the user sees
- **Compatibility** — existing workflows, credentials, or APIs that must keep working
- **Done** — how we will know it works, and what test proves it

Then ask **at most 5 questions**, and only those whose answer would change the
implementation or the tests. A question that does not change what you build is
noise — leave it out. If more than 5 categories are unresolved, pick the ones
with the highest (impact × uncertainty).

Ask **one decision per question**, and always lead with your own recommendation
— you have read the codebase, so the user should be approving a proposal rather
than filling in a blank. If your harness offers a structured multiple-choice
question tool, use it; otherwise ask in plain text, one question per message,
and wait for the answer before moving on. Do not ask about anything the repo
already answers: check `AGENTS.md` and the existing code first.

### 2. Write the spec

Create `.agents/specs/<ticket-id>-<short-name>.md`, using the Linear ticket ID
where there is one, so the spec, the branch, and the ticket all match.

Start from this skeleton and delete what does not apply — an empty section is
worse than no section:

```markdown
# <Feature name>

**Ticket**: https://linear.app/n8n/issue/<TICKET-ID>
**Status**: Draft | In progress | Implemented

## Goal
<One paragraph: what this enables, and for whom.>

## Out of scope
<What this deliberately does not do. Prevents the scope creep argument later.>

## Decisions
| Decision | Choice | Why |
|---|---|---|
<The answers from the clarify pass. This is the section that stops the same
question being re-litigated three weeks later.>

## Contracts
<API endpoints, types added to @n8n/api-types, config/env vars. Code blocks
for shapes, tables for mappings.>

## Structure
<Which packages change, and which files are added.>

## How we know it works
<The test that proves it. Name the file.>

## Implementation TODO
- [ ] <item>
```

### 3. Hand off to the ticket

When the TODO list is settled and the work has a Linear ticket, mirror the list
into it so the work is visible outside the repo, using the `n8n:create-issue`
skill for sub-issues rather than inventing a format. With no ticket, the TODO
list stays in the spec and nothing else is needed. Either way the spec is the
source of truth for *decisions*; the ticket only tracks *progress*.

## Before Starting Work

1. **Find the spec.** Search `.agents/specs/` for files matching the feature:

```bash
ls .agents/specs/
```

2. **Read the full spec.** Understand scope, decisions, API contracts, and
   open questions before writing code.

3. **If no spec exists** and the task is non-trivial (new module, new API,
   architectural change), ask the user whether to create one first — see
   **Creating a Spec** above.

## During Implementation

- **Reference spec decisions** — don't re-decide what the spec already settled.
- **When you diverge from the spec** (better approach found, user requested
  change, constraint discovered), update the spec immediately in the same
  session. Don't leave spec and code out of sync.
- **Tick off TODO checkboxes** (`- [ ]` → `- [x]`) as items are completed.
- **Strike through or annotate** items that were deliberately skipped or
  replaced, with a brief reason:
  ```markdown
  - [x] ~~OpenRouter proxy~~ → Direct execution: nodes call OpenRouter directly
  ```

## After Completing Work

Run a spec verification pass:

1. **Re-read the spec** alongside the implementation.
2. **Check each section:**
   - Do API endpoints in spec match the controller?
   - Do config/env vars in spec match the config class?
   - Does the module structure in spec match the actual file tree?
   - Do type definitions in spec match `@n8n/api-types`?
   - Are all TODO items correctly checked/unchecked?
3. **Update the spec** for any drift found. Common drift:
   - New files added that aren't listed in the structure section
   - API response shapes changed during implementation
   - Config defaults adjusted
   - Architectural decisions refined
4. **Flag unresolved gaps** to the user — things the spec promises but
   implementation doesn't deliver yet (acceptable for MVP, but should be noted).

## Spec File Conventions

- One or more markdown files per feature in `.agents/specs/`.
- Name them `<ticket-id>-<short-name>.md` when a Linear ticket exists.
- Keep specs concise. Use tables for mappings, code blocks for shapes.
- Use `## Implementation TODO` with checkboxes to track progress.
- Split into multiple files when it helps (e.g. separate backend/frontend),
  but don't enforce a rigid naming scheme.

## When the User Asks to "Self-Review" or "Verify Against Spec"

1. Read all relevant specs.
2. Read all implementation files.
3. Produce a structured comparison:
   - **Aligned**: items where spec and code match
   - **Drift**: items where they diverge (fix immediately)
   - **Gaps**: spec items not yet implemented (note as future work)
4. Fix drift, update specs, report gaps to the user.
