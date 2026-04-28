---
description: Keeps implementation and specs in sync. Use when working on a feature that has a spec in .claude/specs/, when the user says /spec, or when starting implementation of a documented feature. Also use when the user asks to verify implementation against a spec or update a spec after changes.
---

# Spec-Driven Development

Specs live in `.claude/specs/`. They are the source of truth for architectural
decisions, API contracts, and implementation scope. Implementation and specs
must stay in sync — neither leads exclusively.

## Core Loop

```
Read spec → Implement → Verify alignment → Update spec or code → Repeat
```

## Before Starting Work

1. **Find the spec.** Search `.claude/specs/` for files matching the feature:

```bash
ls .claude/specs/
```

2. **Read the full spec.** Understand scope, decisions, API contracts, and
   open questions before writing code.

3. **If no spec exists** and the task is non-trivial (new module, new API,
   architectural change), ask the user whether to create one first.

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

- One or more markdown files per feature in `.claude/specs/`.
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
