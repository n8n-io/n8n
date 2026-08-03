# contrib-runway

Evaluate contribution tickets against n8n policy before writing code.

## Layout

```text
contrib-runway/
├── examples/
│   ├── approved-ticket.yaml
│   ├── restricted-ticket.yaml
│   └── set-ticket.yaml
├── policies/
│   └── n8n.yaml
├── src/
│   ├── check.ts
│   ├── evidence.ts
│   └── types.ts
├── tests/
│   └── check.test.ts
├── evidence/
│   └── .gitkeep
├── package.json
├── tsconfig.json
└── README.md
```

Cursor rules that gate this workflow live at the repo root under `.cursor/rules/` (plus `.cursor/BUGBOT.md` for review guidance). READY examples target `packages/nodes-base/nodes/DateTime/` (`approved-ticket.yaml`) and `packages/nodes-base/nodes/Set/` (`set-ticket.yaml`).

## Setup

From this directory (needs Node 22+ and pnpm):

```bash
cd contrib-runway
pnpm install
```

## Usage

Check the approved example (default):

```bash
pnpm check
# same as:
pnpm check -- examples/approved-ticket.yaml
```

Check the restricted example:

```bash
pnpm check -- examples/restricted-ticket.yaml
```

Check the Set-node READY example:

```bash
pnpm check -- examples/set-ticket.yaml
```

Each run prints:

1. Whether the ticket is approved
2. Whether its area is restricted
3. Which tests are required
4. Which repository directory is allowed as context
5. A clear `BLOCKED` or `READY` result

It also writes `evidence/<ticketId>.md` with the same gate result for review.

Exit code `0` = `READY`, `1` = `BLOCKED`.

### Example (`READY`)

```text
Ticket: N8N-DEMO-17
Approved: yes
Area restricted: no
Required tests:
  - linked_or_approved_issue
  - regression_test
  - valid_behavior_test
  - manual_test_instructions
Allowed context directory: packages/nodes-base/nodes/DateTime

Result: READY
```

### Example (`BLOCKED`)

```text
Ticket: N8N-DEMO-18
Approved: yes
Area restricted: yes
Required tests:
  - linked_or_approved_issue
  - regression_test
  - valid_behavior_test
  - manual_test_instructions
Allowed context directory: none

Result: BLOCKED
Block reasons:
  - Area "packages/core/src/execution-engine" is restricted by policy.
```

## Tests

```bash
pnpm test
```

Covers approved, restricted, and unapproved tickets, plus evidence report writing.
