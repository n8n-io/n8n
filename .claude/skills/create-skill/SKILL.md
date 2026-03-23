---
name: create-skill
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
| **`.claude/skills/<name>/` in this repo** | Default for n8n: team-shared, versioned. **Cursor picks up project skills from here** when working in the repo (same idea as Claude Code). |
| `~/.claude/skills/<name>/` | Personal skill for Claude Code across all projects. |
| `~/.cursor/skills/<name>/` | Optional personal skill for Cursor only, global to your machine. |

**Do not** put custom skills in `~/.cursor/skills-cursor/`—that is reserved for Cursor’s built-in skills.

Prefer **repo `.claude/skills/`** for anything that should match how the rest of the team works.

## Before you write: gather requirements

Ask (or infer) briefly:

1. **Purpose** — one concrete task or workflow.
2. **Triggers** — when should the agent apply this skill?
3. **Gaps** — what does the agent *not* already know (project rules, URLs, formats)?
4. **Outputs** — templates, checklists, or strict formats?
5. **Examples** — follow an existing skill in `.claude/skills/` if one fits.

Use AskQuestion when available; otherwise ask in plain language.

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
