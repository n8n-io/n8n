---
description: Create Linear tickets or GitHub issues following n8n conventions. Use when the user asks to create a ticket, file a bug, open an issue, or says /create-issue.
argument-hint: "[linear|github] <description of the issue>"
compatibility:
  requires:
    - mcp: linear
      description: Required for creating Linear tickets
    - cli: gh
      description: Required for creating GitHub issues. Must be authenticated (gh auth login)
---

# Create Issue

Create a Linear ticket or GitHub issue for: **$ARGUMENTS**

## Determine Target

Decide where the issue should be created based on user input:

- If the user says "Linear", "ticket", or provides a team key (e.g., AI, NODE, N8N) → **Linear**
- If the user says "GitHub", "GH issue", or "open source" → **GitHub**
- If ambiguous, **ask the user** which platform they want

---

## Linear Tickets

### Prerequisites

Verify the Linear MCP is connected before proceeding.

### Style Guide

#### Title

- **Sentence case** — capitalize only the first word (e.g., "Add webhook verification to Trello trigger")
- **Descriptive** — a reader should understand the scope without opening the ticket
- **5–15 words** — long enough to be specific, short enough to scan
- **Imperative mood for features/enhancements** — "Add ...", "Support ...", "Improve ..."
- **Bug titles** — prefix with `Bug -` followed by a description of the symptom (e.g., "Bug - Pin data not updating after workflow edit")
- **No ticket IDs in titles** — the identifier (AI-1234) is assigned automatically
- **No trailing punctuation**

#### Description

Structure the description using markdown headers. Use the appropriate template:

**For bugs:**

```markdown
## Description
[Clear explanation of the problem]

## Expected
[What should happen]

## Actual
[What happens instead]

## Attachments
[Screenshots, videos, or screen recordings that illustrate the problem]

## Steps to reproduce
1. [Step-by-step reproduction]

## Additional context
- n8n version: [version]
- Database: [SQLite/PostgreSQL]
- Hosting: [cloud/self-hosted]
```

**For features / enhancements:**

```markdown
## Summary
[One-paragraph overview of what this adds or changes]

## Problem
[What limitation or gap exists today]

## Proposed solution
[How it should work — technical approach if known]

## Out of scope
[Explicitly note what this does NOT cover, if helpful]
```

**For tech debt:**

```markdown
## Summary
[What technical improvement is needed]

## Current state
[What the code/system looks like today and why it's problematic]

## Proposed improvement
[What the improved state should look like]

## Motivation
[Why this matters — maintainability, performance, developer experience, etc.]

## Scope
[What is included / excluded from this work]
```

**For spikes / investigations:**

```markdown
## Goal
[What question are we trying to answer]

## Context
[Why this investigation is needed now]

## Expected output
[What deliverable is expected — RFC, PoC, decision document, etc.]
```

#### Attachments (Screenshots / Videos)

If the user provides screenshots, videos, or screen recordings:

- **URLs** — embed directly in the description using markdown image syntax (`![description](url)`)
- **File paths** — if the user provides a local file path, ask them to upload it to a hosting service (e.g., GitHub, Imgur) or use `mcp__linear-server__create_attachment` to attach it to the Linear ticket after creation
- **Pasted images in conversation** — describe what the image shows in the ticket description and note that a screenshot was provided. You cannot upload binary data directly.

Always mention in the description when visual evidence was provided, even if it cannot be directly embedded.

#### Priority

| Value | Level    | When to use |
|-------|----------|-------------|
| 4     | Low      | Nice-to-have, no user impact |
| 3     | Normal   | Default — standard planned work |
| 2     | High     | Blocks other work or affects users significantly |
| 1     | Urgent   | Production-breaking, security vulnerability, data loss |
| 0     | None     | Not yet assessed |

**Guardrails:**
- **Default to Normal (3)** unless the user explicitly states otherwise
- **Never set Urgent (1)** unless the user explicitly says "urgent", "P0", "production down", or "security vulnerability"
- **Never set None (0)** — always make a priority assessment. If unsure, use Normal (3)

#### Status

**Guardrails:**
- **Never create issues in Triage status** — Triage is for externally-reported issues that enter through automated pipelines (GitHub sync, support escalation). Agent-created tickets have known context and should skip triage
- **Default to Backlog** — use this when the issue is acknowledged but not yet planned for a sprint
- **Use Todo** only when the user indicates the work is planned for the current cycle or should be picked up soon
- **Never set In Progress, Review, or Done** at creation time

#### Team

- **Try to fetch up-to-date team areas of responsibility from Notion** using `mcp__notion__notion-search` (search for "areas of responsibility" or similar). Use the fetched data to determine the best team for the issue.
- **If Notion MCP is unavailable or the lookup fails**, fall back to these common teams: `Engineering` (N8N), `AI`, `NODES`, `Identity & Access` (IAM), `Catalysts` (CAT), `Lifecycle & Governance` (LIGO), `Cloud Platform`, `Docs` (DOC)
- **Always ask the user which team** if not obvious from context or the Notion lookup
- If the issue is node-specific, it likely belongs to `NODES`
- If it involves AI/LangChain nodes, it likely belongs to `AI`

#### Labels

Apply labels from these groups as appropriate:

**Type (pick one):**
- `bug` — something is broken
- `feature` — net-new capability
- `enhancement` — improvement to existing functionality
- `tech debt` — internal quality improvement
- `spike` — time-boxed investigation
- `doc` — documentation-only change

**Area (pick if applicable):**
- `frontend`, `backend`, `performance`, `testing`, `infra`, `DX`, `Security-Team`

**Source (pick if applicable):**
- `Internal` — created by team members
- `GitHub` — originated from a GitHub issue
- `Sentry` — originated from error monitoring
- `Zammad` — originated from support

**Bucket (pick if applicable):**
- Use the relevant feature-area bucket (e.g., `Credentials`, `Canvas/Node`, `RBAC`, `LangChain nodes`, `Form Trigger`, etc.)

**Guardrails:**
- **Always apply a type label** — every ticket needs at least a type
- **Do not apply triage-state labels** (`Triage: Pending`, `Triage: Complete`, etc.) — these are managed by triage automation
- **Do not apply release labels** (`n8n@1.36.0`, etc.) — these are managed by release automation
- **Do not apply `docs-automation` labels** — these are managed by docs automation

#### Estimates

Only set an estimate if the user provides one or explicitly asks for one. Use t-shirt sizes:

| Size | Value | Approximate effort |
|------|-------|--------------------|
| XS   | 1     | ≤ 1 hour           |
| S    | 2     | ≤ 1 day            |
| M    | 3     | 2–3 days           |
| L    | 4     | 3–5 days           |
| XL   | 5     | ≥ 6 days           |

### Creating the Ticket

1. **Gather required fields** — if any are missing, ask the user:
   - Title
   - Team
   - Description (draft one from the user's input using the templates above)

2. **Present a preview** before creating — show the user:
   - Title
   - Team
   - Status
   - Priority
   - Labels
   - Description (abbreviated if long)

3. **Wait for user confirmation** — do not create until the user approves

4. **Create the ticket** using `mcp__linear-server__save_issue`:
   ```
   title: <title>
   team: <team name>
   description: <markdown description>
   priority: <priority number>
   state: <status name>
   labels: [<label names>]
   ```

5. **Report back** with the issue identifier and URL

### Things to Never Do (Linear)

- Never create issues in **Triage** status
- Never set **Urgent** priority without explicit user instruction
- Never apply **triage-state**, **release**, or **docs-automation** labels
- Never set **assignee** unless the user explicitly asks
- Never set a **cycle** or **milestone** unless the user explicitly asks
- Never create **duplicate issues** — if the user describes something that sounds like it may exist, search first with `mcp__linear-server__list_issues`

---

## GitHub Issues

### Prerequisites

Verify `gh` CLI is authenticated: `gh auth status`

### Important Context

The n8n GitHub issue tracker (`n8n-io/n8n`) is **bug-only**. Feature requests and questions are redirected to the [community forum](https://community.n8n.io). Blank issues are disabled — the bug template must be used.

### Style Guide

#### Title

- **Sentence case** — same as Linear
- **Descriptive of the symptom** — what is broken, not what you want
- **No prefixes required** — do not add "Bug:" or "Bug Report:" (the template handles categorization)
- **No trailing punctuation**

#### Body

GitHub issues **must** follow the bug report template structure:

```markdown
### Bug Description

[Clear explanation of the bug]

### Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior

[What should happen]

### Debug Info

[If available — output from Help > About n8n > Copy debug information]

### Operating System

[e.g., macOS 14.2, Ubuntu 22.04]

### n8n Version

[e.g., 1.72.1]

### Node.js Version

[e.g., 20.11.0]

### Database

SQLite / PostgreSQL

### Execution Mode

main / queue

### Hosting

n8n cloud / self hosted
```

**Guardrails:**
- **Always include reproduction steps** — issues without them get closed as `closed:incomplete-template`
- **Include debug info if available** — this is critical for triage
- **Never file feature requests as GitHub issues** — redirect the user to the community forum or suggest creating a Linear ticket instead

#### Labels

Do **not** manually apply labels when creating GitHub issues. The triage automation handles labeling:
- `triage:pending` is auto-applied
- `status:in-linear` is auto-applied when synced

### Creating the Issue

1. **Verify it's a bug** — if the user describes a feature request, inform them that GitHub issues are bug-only and suggest alternatives (Linear ticket or community forum)

2. **Draft the issue** using the template above, filling in fields from the user's input

3. **Present a preview** before creating — show the user:
   - Title
   - Body (abbreviated if long)
   - Repository (default: `n8n-io/n8n`)

4. **Wait for user confirmation**

5. **Create the issue** using `gh`:
   ```bash
   gh issue create --repo n8n-io/n8n --title "<title>" --body "$(cat <<'EOF'
   <body content>
   EOF
   )"
   ```

6. **Report back** with the issue number and URL

### Things to Never Do (GitHub)

- Never file **feature requests** as GitHub issues
- Never create issues **without reproduction steps**
- Never manually apply **labels** — let automation handle it
- Never create issues in **repositories other than n8n-io/n8n** unless the user explicitly specifies

---

## Cross-Linking

When both a Linear ticket and GitHub issue exist for the same problem:

- **Linear → GitHub**: Add the GitHub issue URL as a link attachment on the Linear ticket
- **GitHub → Linear**: Add `https://linear.app/n8n/issue/<TICKET-ID>` in the GitHub issue body

If the user creates one and mentions the other exists, offer to add the cross-link.
