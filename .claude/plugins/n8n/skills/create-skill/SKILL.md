---
description: >-
  Guides users through creating effective Agent Skills. Use when you want to
  create, write, or author a new skill, or asks about skill structure, best
  practices, or SKILL.md format.
---
# Creating skills

Skills are markdown (plus optional scripts) that teach the agent a focused workflow. **Keep SKILL.md short**—the context window is shared with chat, code, and other skills.

## Where skills live

| Location | When to use |
|----------|-------------|
| **`.claude/plugins/n8n/skills/<name>/`** | Default for n8n: team-shared, versioned, namespaced under `n8n:`. |
| `~/.claude/skills/<name>/` | Personal skill for Claude Code across all projects. |
| `~/.cursor/skills/<name>/` | Optional personal skill for Cursor only, global to your machine. |

**Do not** put custom skills in `~/.cursor/skills-cursor/`—that is reserved for Cursor’s built-in skills.

Prefer **plugin `.claude/plugins/n8n/skills/`** for anything that should match how the rest of the team works.

## Before you write: gather requirements

Ask (or infer) briefly:

1. **Purpose** — one concrete task or workflow.
2. **Triggers** — when should the agent apply this skill?
3. **Gaps** — what does the agent *not* already know (project rules, URLs, formats)?
4. **Outputs** — templates, checklists, or strict formats?
5. **Examples** — follow an existing skill in `.claude/plugins/n8n/skills/` if one fits.

Ask the user in plain language when you need more detail.

## File layout

```
skill-name/
├── SKILL.md       # required
├── reference.md   # optional — detail the agent reads only if needed
├── examples.md    # optional
└── scripts/       # optional
```

### Frontmatter (required)

```yaml
---
name: skill-name          # lowercase, hyphens, max 64 chars
description: >-         # max 1024 chars, non-empty — see below
  ...
---
```

**Description** (discovery is everything — third person, WHAT + WHEN, trigger words):

- Good: `Extracts tables from PDFs and fills forms. Use when the user works with PDFs, forms, or document extraction.`
- Bad: `Helps with documents` or `I can help you with PDFs`

## Authoring rules

1. **Concise** — assume the model is capable; only add non-obvious domain or project facts.
2. **Progressive disclosure** — essentials in `SKILL.md`; long reference in `reference.md`. Link **one level deep** from `SKILL.md`.
3. **Prefer one default** — e.g. one library or one workflow; add an escape hatch only if needed.
4. **Stable wording** — one term per concept; avoid dated “until month X” notes unless you tuck legacy bits behind a short “Deprecated” note.
5. **Paths** — forward slashes only (`scripts/foo.py`).

**Rough size:** aim for **well under ~200 lines** in `SKILL.md`; if it grows, split detail out.

### Scope: one job per skill (and parent skills)

- **Single responsibility** — one primary workflow or decision tree per skill. If triggers and steps diverge a lot (e.g. “create issue” vs “create PR” vs “full ticket → PR flow”), split into **smaller dedicated skills**.
- **Prefer small + compose** — two or three focused skills keep irrelevant detail out of context until needed. A **parent** (orchestrator) skill can say *when* to follow each child workflow and link to their `SKILL.md`; avoid pasting full child content into the parent.
- **When one large skill is OK** — a single end-to-end flow that always runs together and shares one tight checklist;

### MCPs, CLI tools, and other skills

- **Prefer CLI and repo commands** when they solve the same problem — agents handle them well and they usually add less scaffolding noise to context than MCP tool discovery and schemas. Examples: `gh` for PRs/issues, `pnpm` scripts from `AGENTS.md`.
- **MCPs are optional per user** — not everyone has the same servers enabled. If a skill **requires** a specific MCP to work as written, say so explicitly:
  - Put a hint in the **frontmatter description** (e.g. “Requires Linear MCP for …”) so mismatches are obvious early.
  - Add a short **Prerequisites** (or **Requirements**) block near the top: which integration, what it is used for, and a **fallback** (e.g. web UI, `gh`, or “ask the user to paste …”) when it is missing.
- **Referencing other skills** — use the namespaced invocation name (e.g. `n8n:create-issue`) so the agent resolves the plugin skill. For human-readable links, give the path from the repo root (e.g. `.claude/plugins/n8n/skills/create-issue/SKILL.md`). From a sibling folder, a relative link works too: `[create-issue](../create-issue/SKILL.md)`. Parent skills should delegate steps instead of duplicating long procedures.

## Patterns (pick what fits)

- **Template** — give the exact output shape (markdown/code blocks).
- **Checklist** — numbered or `- [ ]` steps for multi-step work.
- **Branching** — “If A → …; if B → …” at the top of a workflow.
- **Scripts** — document run commands; say whether to **execute** or **read** the script.

## Workflow: create → verify

1. **Name + description** — hyphenated name; description with triggers.
2. **Outline** — minimal sections; link optional files.
3. **Implement** — `SKILL.md` first; add `reference.md` / `scripts/` only if they save tokens or reduce errors.
4. **Check** — third-person description; terminology consistent; no duplicate encyclopedic content the model already knows.

## Anti-patterns

- Verbose tutorials (“what is a PDF”) inside the skill.
- Many equivalent options with no default.
- Vague names (`helper`, `utils`).
- Deep chains of linked files.
- Assuming an MCP or tool is present without stating it or offering a fallback.
- One oversized skill that mixes unrelated workflows instead of smaller skills + a thin parent.

## Quick example stub

```markdown
---
name: my-workflow
description: Does X using project convention Y. Use when the user asks for X or mentions Z.
---

# My workflow

1. …
2. …

## Output format

Use a fenced code block for the exact shape reviewers should see.

## More detail
See [reference.md](reference.md) if edge cases matter.
```
