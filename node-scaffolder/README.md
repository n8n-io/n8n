# node-scaffolder

Scaffold a **declarative** n8n node under `packages/nodes-base/nodes/<NewNode>/` from a short YAML or text spec.

## Important (read this)

Unsolicited **new node** PRs into the n8n monorepo are normally **auto-closed** (see root `CONTRIBUTING.md`). This tool is for **local simulation / interview exercises**.

For real custom nodes, use the community package flow:

```bash
npm create @n8n/node@latest
```

## What it does

1. Parses a short spec (YAML or text like `"add a node for the Etsy REST API"`)
2. Writes node + description + credential **draft** + Vitest harness stub + `NODE_CARD.md`
3. Enforces a hard write boundary: **only** `packages/nodes-base/nodes/<NewNode>/`
4. Runs `eslint` from `packages/nodes-base` (includes `eslint-plugin-n8n-nodes-base`) in a fix/check loop
5. Prints a live boundary report and out-of-scope follow-ups (`package.json` registration, `credentials/`)

## Layout

```text
node-scaffolder/
├── examples/
│   └── etsy.yaml
├── src/
│   ├── cli.ts
│   ├── parse-spec.ts
│   ├── generate.ts
│   ├── boundary.ts
│   ├── lint-loop.ts
│   ├── tests.ts
│   ├── node-card.ts
│   └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

```bash
cd node-scaffolder
pnpm install
```

Requires Node 22+, pnpm, and a checkout where `packages/nodes-base` can run eslint.
If the lint loop reports tooling failures, build workspace eslint packages first:

```bash
pnpm --filter @n8n/eslint-config build
pnpm --filter @n8n/eslint-plugin-community-nodes build
```

## Usage

```bash
# YAML spec
pnpm scaffold --spec examples/etsy.yaml

# Short text (deterministic parser — no LLM)
pnpm scaffold --text "add a node for the Etsy REST API"
```

From the repo root:

```bash
pnpm --dir node-scaffolder exec tsx src/cli.ts --spec examples/etsy.yaml
```

## Boundary

Every write goes through `WriteBoundary`. Credentials that belong in `packages/nodes-base/credentials/` are emitted as **`credentials-draft/`** inside the node folder and must be copied manually. The CLI never edits `package.json`.

## Conventions sources

- `packages/nodes-base/AGENTS.md`
- Declarative patterns from Okta / `@n8n/node-cli` templates
- Lint rules from `eslint-plugin-n8n-nodes-base` via `packages/nodes-base/eslint.config.mjs`
- Tests: Vitest + `NodeTestHarness` (not Jest)

## After scaffolding

1. Read `packages/nodes-base/nodes/<NewNode>/NODE_CARD.md`
2. Register the node (and credentials) outside the boundary if you need the editor to load it
3. Strengthen pinData / nock in the generated workflow fixture
4. Prefer community packaging for anything you intend to ship
