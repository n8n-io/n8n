---
name: validate-compiler-fixture
description: Validate simplified compiler fixtures through the full pipeline (transpile, generate, structural checks, SDK validation, pin-data execution). Use when user says /validate-fixture or asks to validate compiler fixtures.
user_invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# Validate Compiler Fixture

Validates simplified compiler fixtures through the full compilation pipeline.
Accepts `$ARGUMENTS` as a fixture ID (e.g., `w02`) or `all` for every fixture.

## Constants

```
FIXTURES_DIR = packages/@n8n/workflow-sdk/src/simplified-compiler/__fixtures__
SDK_PKG      = packages/@n8n/workflow-sdk
```

## Step 1: Identify Target Fixtures

1. If `$ARGUMENTS` is a specific ID (e.g., `w02`), find the matching directory: `$FIXTURES_DIR/w02-*/`
2. If `$ARGUMENTS` is `all`, enumerate all `$FIXTURES_DIR/w*-*/` directories sorted by name
3. For each fixture, read `meta.json` — skip fixtures where `skip` is set (report as SKIPPED)
4. Confirm each fixture has: `input.js`, `output.js`, `meta.json`

## Step 2: Run Transpile + Generate Pipeline

For each fixture, run two pipeline stages:

### Stage A: Transpile (input.js -> SDK code)

```bash
pushd $SDK_PKG
npx tsx -e "
  const { transpileWorkflowJS } = require('./src/simplified-compiler/compiler');
  const fs = require('fs');
  const input = fs.readFileSync('$FIXTURE_DIR/input.js', 'utf-8');
  const result = transpileWorkflowJS(input);
  if (result.errors.length > 0) {
    console.error(JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }
  console.log(result.code);
" > /tmp/transpiled_output.js 2> /tmp/transpile_errors.txt
popd
```

- Compare `/tmp/transpiled_output.js` against `output.js` — must match exactly
- If transpile errors, record and continue to next fixture

### Stage B: Generate (output.js -> workflow.json)

```bash
pushd $SDK_PKG
npx tsx -e "
  const { parseWorkflowCode } = require('./src/codegen/parse-workflow-code');
  const fs = require('fs');
  const code = fs.readFileSync('$FIXTURE_DIR/output.js', 'utf-8');
  const workflow = parseWorkflowCode(code);
  console.log(JSON.stringify(workflow, null, 2));
" > /tmp/generated_workflow.json 2> /tmp/generate_errors.txt
popd
```

- If `workflow.json` already exists in the fixture dir, compare structurally (ignore `id` fields since UUIDs differ between runs)
- If generation fails, record error and continue

## Step 3: Validate Workflow Structure

Read the `workflow.json` (either existing or freshly generated) and check:

### 3a. Node Properties

For each node, verify by type:

| Node Type | Required Properties |
|-----------|-------------------|
| `n8n-nodes-base.httpRequest` | `parameters.method` (GET/POST/PUT/PATCH/DELETE), `parameters.url` (non-empty string) |
| `n8n-nodes-base.if` | `parameters.conditions.conditions[]` each has `leftValue`, `operator.type`, `operator.operation`. For `singleValue: true` operators (exists/notExists) `rightValue` is NOT required |
| `n8n-nodes-base.switch` | `parameters.value` (non-empty) |
| `n8n-nodes-base.code` | `parameters.jsCode` (non-empty string), `parameters.mode` |
| `n8n-nodes-base.webhook` | `parameters.httpMethod`, `parameters.path` |
| `n8n-nodes-base.scheduleTrigger` | `parameters.rule.interval` (non-empty array) |
| `n8n-nodes-base.respondToWebhook` | `parameters.respondWith` |
| `n8n-nodes-base.executeWorkflow` | `parameters.workflowId` or `parameters.workflowId.value` |
| `n8n-nodes-base.aggregate` | node exists (used after loop patterns) |

### 3b. Connections

- Every source node name in `connections` must exist in the `nodes` array
- Every target `node` name in connection entries must exist in the `nodes` array
- IF nodes (`n8n-nodes-base.if`) should have `main[0]` (true branch) and `main[1]` (false branch) unless one branch is intentionally empty
- Switch nodes should have multiple output indices
- No orphan nodes (every non-trigger node should be a connection target, unless it's explicitly disconnected)

### 3c. Expression References

- Find all `$('NodeName')` patterns in parameters (including nested JSON strings)
- Verify each referenced `NodeName` exists in the `nodes` array
- Verify the referenced node is upstream of the referencing node (exists in the connection path)

### 3d. Credentials

- For nodes with `credentials` field: credential type key (e.g., `httpHeaderAuth`) should match the `genericAuthType` parameter value
- Empty `id: ""` is expected in fixture credentials (not a real credential ID)

### 3e. SDK Validation

```bash
pushd $SDK_PKG
npx tsx -e "
  const { validateWorkflow } = require('./src/validation');
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('$FIXTURE_DIR/workflow.json', 'utf-8'));
  const result = validateWorkflow(json, { strictMode: true });
  console.log(JSON.stringify(result, null, 2));
"
popd
```

- Record all errors and warnings
- `strictMode: true` enables additional checks

## Step 4: Pin Data Execution (Optional)

> This step requires a running n8n instance and the `--manual` CLI flag.
> Skip this step if n8n is not available. Report as "EXECUTION: skipped (no n8n instance)".

### 4a. Generate Pin Data

For each non-trigger node in the workflow, generate mock pin data based on type:

| Node Type / Method | Pin Data Shape |
|-------------------|---------------|
| HTTP GET | `[{ "json": { "data": "mock", "status": "ok" } }]` |
| HTTP POST/PUT/PATCH/DELETE | `[{ "json": { "success": true, "id": "mock-id" } }]` |
| Webhook trigger | `[{ "json": { "body": { "action": "test" }, "headers": {} } }]` |
| Schedule trigger | `[{ "json": { "timestamp": "2024-01-01T00:00:00Z" } }]` |
| Error trigger | `[{ "json": { "execution": { "error": { "message": "test" } } } }]` |
| Execute workflow | `[{ "json": { "result": "mock" } }]` |
| Code node | `[{ "json": { "result": "computed" } }]` |
| IF node | `[{ "json": { "match": true } }]` |
| Switch node | `[{ "json": { "routed": true } }]` |
| Aggregate node | `[{ "json": { "items": [] } }]` |
| Respond to Webhook | (no pin data needed — terminal node) |

### 4b. Insert Pin Data

Create a copy of `workflow.json` with `pinData` added:

```json
{
  ...workflowJson,
  "pinData": {
    "NodeName1": [{ "json": { ... } }],
    "NodeName2": [{ "json": { ... } }]
  }
}
```

### 4c. Import and Execute

```bash
# Import workflow
pnpm n8n import:workflow --input=/tmp/fixture_with_pins.json

# Get the imported workflow ID (from n8n's response or list)
WORKFLOW_ID=$(pnpm n8n list:workflow --format=json | jq -r '.[-1].id')

# Execute with manual mode (enables pin data)
pnpm n8n execute --id=$WORKFLOW_ID --manual --rawOutput > /tmp/execution_result.json 2>&1
```

### 4d. Check Results

- Execution should complete without errors
- Each node should have execution data in the result
- No node should have `error` in its execution output

## Step 5: Report

Generate a summary report for each fixture:

```
## Fixture Validation Report

### [w02] Auto-update n8n
Pipeline: TRANSPILE [pass] -> GENERATE [pass] -> VALIDATE [pass] -> EXECUTE [skip]

Nodes (6):
| # | Name | Type | Status |
|---|------|------|--------|
| 1 | Schedule Trigger | scheduleTrigger | ok |
| 2 | GET registry.npmjs.org/n8n/latest | httpRequest | ok |
| 3 | GET 0.0.0.0/rest/settings | httpRequest | ok |
| 4 | IF 1 | if | ok |
| 5 | POST my-server/api/exec | httpRequest | ok |
| 6 | POST my-server/api/exec 1 | httpRequest | ok |

Connections:
  Schedule Trigger -> GET registry.npmjs.org/n8n/latest -> GET 0.0.0.0/rest/settings -> IF 1
    IF 1 [true] -> POST my-server/api/exec
    IF 1 [false] -> POST my-server/api/exec 1

Issues: none

Verdict: PASS
```

### Issue Severity

| Severity | Meaning |
|----------|---------|
| ERROR | Structural problem — workflow will not execute correctly |
| WARNING | Potential issue — may work but is suspicious |
| INFO | Notable pattern — expected compiler behavior |

### Expected Patterns (not issues)

- `executeOnce: true` on non-trigger, non-loop-body nodes — this is correct compiler behavior
- Empty credential `id: ""` — fixtures don't have real credentials
- IF nodes with `options.leftValue: ""` — top-level options leftValue is separate from conditions
- Loop patterns: Split Code node + per-item HTTP (no executeOnce) + optional Aggregate node
- Duplicate base names with suffix (e.g., "POST my-server/api/exec" and "POST my-server/api/exec 1") — name deduplication is correct

### Overall Summary

At the end, provide:

```
## Summary
Total: X fixtures | Pass: Y | Fail: Z | Skipped: S

Failed fixtures:
- wXX: [brief reason]
```
