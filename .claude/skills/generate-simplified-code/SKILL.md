---
name: generate-simplified-code
description: Use when converting an n8n workflow template to simplified DSL code, when user says /generate-simplified-code, or asks to generate simplified code from a template ID, URL, or workflow JSON file.
---

# Generate Simplified Code from Workflow Template

Generates simplified JS DSL code from an n8n workflow template JSON.
Accepts `$ARGUMENTS` as:
- A numeric template ID (e.g., `4335`) — fetched from the n8n API
- A URL (e.g., `https://api.n8n.io/api/workflows/4335`)
- A local file path (e.g., `test-fixtures/real-workflows/10000.json`)

## Constants

```
SDK_PKG      = packages/@n8n/workflow-sdk
FIXTURES_DIR = packages/@n8n/workflow-sdk/src/simplified-compiler/__fixtures__
```

## Step 1: Fetch the Workflow JSON

### From n8n API (numeric ID or URL):

```bash
curl -s "https://api.n8n.io/api/workflows/${TEMPLATE_ID}" > /tmp/template_response.json
```

Inspect the response structure and extract the workflow JSON (the `nodes` and `connections` arrays). The API may wrap the workflow inside nested fields — look for the object containing `nodes[]` and `connections{}`.

### From local file:

Local files at `test-fixtures/real-workflows/{id}.json` contain the workflow JSON directly at the top level — no unwrapping needed.

## Step 2: Analyze the Workflow

Read the full workflow JSON and understand the structure before writing any code.

### 2a. Identify the Trigger

Find the trigger node in `nodes[]` by matching its `type`:

| n8n Node Type | DSL Callback | Extract From Parameters |
|---|---|---|
| `n8n-nodes-base.manualTrigger` | `onManual(async () => {...})` | Nothing |
| `n8n-nodes-base.webhook` | `onWebhook({ method, path }, async ({body, respond}) => {...})` | `parameters.httpMethod`, `parameters.path`, `parameters.responseMode` |
| `n8n-nodes-base.scheduleTrigger` | `onSchedule({...}, async () => {...})` | `parameters.rule.interval` — convert using schedule table below |
| `n8n-nodes-base.errorTrigger` | `onError(async ({error, workflow}) => {...})` | Nothing |

If no recognized trigger exists, check for other trigger-like nodes (e.g., `telegramTrigger`, `slackTrigger`). These are unsupported — flag them and approximate with `onWebhook` or `onManual` with a comment.

**Schedule Conversion (n8n rule → DSL):**

| n8n `interval[0].field` | Param Key | DSL |
|---|---|---|
| `seconds` | `secondsInterval` | `{ every: '${value}s' }` |
| `minutes` | `minutesInterval` | `{ every: '${value}m' }` |
| `hours` | `hoursInterval` | `{ every: '${value}h' }` |
| `days` | `daysInterval` | `{ every: '${value}d' }` |
| `weeks` | `weeksInterval` | `{ every: '${value}w' }` |
| `cronExpression` | `expression` | `{ cron: '${expression}' }` |

Source: `src/shared/schedule-mapping.ts`

If `responseMode` is `responseNode`, the webhook callback must destructure `{ body, respond }` and the DSL must include a `respond()` call somewhere in the body.

### 2b. Build Topological Order

The `connections` object is indexed by **source node name**:

```json
{
  "Node A": {
    "main": [
      [{ "node": "Node B", "type": "main", "index": 0 }],
      [{ "node": "Node C", "type": "main", "index": 0 }]
    ]
  }
}
```

- `main[0]` = first output (true branch for IF, default for others)
- `main[1]` = second output (false branch for IF)
- Multiple entries at the same `main[N]` = fan-out (parallel)

Walk from trigger node forward, following connections, to build the execution order.

### 2c. Map Each Node to DSL

Process nodes in topological order:

| n8n Node Type | DSL Equivalent | Notes |
|---|---|---|
| `n8n-nodes-base.httpRequest` | `await http.METHOD(url, body?, options?)` | See Step 2d |
| `n8n-nodes-base.code` | Inline JS statements | Extract from `parameters.jsCode`, clean up `$()` references |
| `n8n-nodes-base.set` | `const varName = "value"` | One `const` per assignment |
| `n8n-nodes-base.if` | `if (condition) { ... } else { ... }` | See Step 2f |
| `n8n-nodes-base.switch` | `switch (expr) { case ...: ... }` | See Step 2g |
| `n8n-nodes-base.respondToWebhook` | `respond({ status, body, headers })` | Only in webhook callbacks |
| `n8n-nodes-base.executeWorkflow` | `await workflow.run('Name')` | Use workflow name or ID |
| `@n8n/n8n-nodes-langchain.agent` | `await ai.chat(model, prompt, opts)` | See Step 2e |
| `n8n-nodes-base.aggregate` | (skip — compiler auto-inserts after loops) | |
| `n8n-nodes-base.splitInBatches` | `for (const item of items) { ... }` | Convert to for-of loop |
| `n8n-nodes-base.stickyNote` | (skip entirely) | |
| `n8n-nodes-base.noOp` | (skip entirely) | |
| Any other node type | Flag + approximate | See Step 3 |

### 2d. Convert HTTP Request Nodes

Extract from the node's `parameters`:

**Method:** `parameters.method` (GET, POST, PUT, PATCH, DELETE) → lowercase for DSL

**URL:** `parameters.url` — may contain expressions like `={{ $('Set').first().json.apiUrl }}`; convert to variable reference

**Body (POST/PUT/PATCH):**
- If `parameters.sendBody` is true and `parameters.specifyBody` is `'json'`:
  - `parameters.jsonBody` contains the body as a JSON string
- If `parameters.bodyParameters` exists, build body from key-value pairs

**Headers:** If `parameters.sendHeaders` is true, extract from `parameters.headerParameters`

**Query:** If `parameters.sendQuery` is true, extract from `parameters.queryParameters`

**Authentication:**

```javascript
// When parameters.authentication === 'genericCredentialType'
// parameters.genericAuthType tells you the n8n credential type
// node.credentials[credType].name is the credential display name

// Reverse mapping (source: src/shared/credential-mapping.ts):
//   httpHeaderAuth -> bearer
//   httpBasicAuth  -> basic
//   oAuth2Api      -> oauth2
```

**Assembling the DSL call:**

```javascript
// GET/DELETE — no body
await http.get(url);
await http.get(url, { auth: { type: 'bearer', credential: 'My API Key' } });

// POST/PUT/PATCH — body + optional options
await http.post(url, bodyObj);
await http.post(url, bodyObj, { auth: { type: 'oauth2', credential: 'Google' } });

// Headers and query go in the options object alongside auth
await http.get(url, { auth: {...}, headers: { 'X-Custom': 'val' }, query: { page: '1' } });
```

### 2e. Convert AI Agent Nodes

For `@n8n/n8n-nodes-langchain.agent`:

1. **Model:** Find the connected language model subnode (connection type `ai_languageModel`). The model string is in `parameters.model` or `parameters.modelId`.
2. **Prompt:** `parameters.text` is the prompt text.
3. **Tools:** Connected via `ai_tool` connections. For each tool subnode:
   - `toolCode` type → `{ type: 'code', name, code: parameters.jsCode }`
   - `toolHttpRequest` type → `{ type: 'httpRequest', name, url: parameters.url }`
4. **Output Parser:** Connected via `ai_outputParser`. Extract `{ type: 'structured', schema }`.
5. **Memory:** Connected via `ai_memory`. Extract `{ type: 'bufferWindow', contextLength }`.

```javascript
const result = await ai.chat('gpt-4o', 'Your prompt', {
  tools: [{ type: 'code', name: 'calculator', code: '...' }],
  memory: { type: 'bufferWindow', contextLength: 5000 },
});
```

### 2f. Convert IF Nodes

Extract `parameters.conditions.conditions[]`. Each condition has:
- `leftValue` — often an expression like `={{ $('HTTP 1').first().json.status }}`
- `operator.operation` — `equals`, `notEquals`, `gt`, `lt`, `gte`, `lte`, `exists`, `notExists`, `true`, `false`
- `rightValue` — the comparison value

**Operator mapping:**

| n8n Operation | JS Operator |
|---|---|
| `equals` | `===` |
| `notEquals` | `!==` |
| `gt` | `>` |
| `lt` | `<` |
| `gte` | `>=` |
| `lte` | `<=` |
| `exists` | Truthiness check (no right operand) |
| `notExists` | `!` prefix (no right operand) |

Convert expression references to variable names. True branch = `main[0]` connections, false branch = `main[1]` connections.

Multiple conditions with `combinator: 'and'` → `&&`, `combinator: 'or'` → `||`.

### 2g. Convert Switch Nodes

Extract `parameters.rules.values[]`. Each rule has `conditions` matching a case value. Each case maps to `main[index]` output. If `parameters.options.fallbackOutput` is `'extra'`, there's a `default:` case.

### 2h. Detect Loop Patterns

A loop in n8n typically looks like:
1. A Code node that splits items: `return items.map(item => ({json: item}))` (or a `splitInBatches` node)
2. Subsequent nodes **without** `executeOnce: true` — these process per-item
3. An optional Aggregate node after the loop body

Convert this to: `for (const item of array) { ... }`

The splitter and aggregate nodes are omitted from the DSL — the compiler generates them automatically.

### 2i. Convert Expression References to Variables

This is the most critical step. n8n expressions like `={{ $('NodeName').first().json.field }}` must become plain JS variable references.

**Algorithm:**
1. As you process each node, assign a meaningful variable name to its output:
   - HTTP GET `/api/users` → `const users = await http.get(...)`
   - Set node with assignments → individual `const` declarations
   - Code node → use the variable names from its return statement
2. Maintain a map: `nodeName → variableName`
3. When you encounter an expression referencing `$('NodeName')`:
   - Look up `NodeName` in the map → get `variableName`
   - `$('NodeName').first().json.field` → `variableName.field`
   - `$('NodeName').all()` → `variableName` (when used as array in code)
4. For Code nodes with `jsCode` containing `$()` references:
   - Replace each `$('NodeName').first().json` → the variable name
   - The Code node's logic becomes inline JS in the DSL

### 2j. Variable Naming

Derive meaningful names:
- From URL path: `GET /api/users` → `users`, `GET /api/orders/{id}` → `order`
- From node name: `"Fetch Customer Data"` → `customerData`
- From Set node field names: assignment `name: "status"` → `const status = ...`
- If the result is not referenced downstream, omit the `const x =` assignment

## Step 3: Detect and Flag Unsupported Patterns

Add warnings as comments in the generated DSL and in the report:

| Pattern | How to Detect | Action |
|---|---|---|
| Merge nodes | `n8n-nodes-base.merge` in nodes | `// WARNING: Merge node "${name}" cannot be expressed in DSL — data convergence lost` |
| Wait nodes | `n8n-nodes-base.wait` | `// WARNING: Wait node not supported in DSL` |
| Non-HTTP integration nodes | Type not in supported list above | Approximate with `http.*` + comment: `// Approximated from: ${type} ("${name}")` |
| Cycles | Node appears in its own downstream path | `// WARNING: Cycle detected — not expressible in DSL` |
| Multiple triggers | >1 trigger node | Generate separate callbacks, note sharing is limited |
| `$input`, `$prevNode`, `$env` | Found in expressions | `// WARNING: ${expr} not supported in DSL — replaced with placeholder` |
| Convergence points | Node has >1 incoming source from different branches | May need restructuring; flag if it implies a merge |

## Step 4: Generate the DSL Code

Write the DSL following these conventions (matching existing fixtures):

- **Indentation:** tabs
- **Strings:** single quotes
- **Trailing commas:** yes, in multi-line objects/arrays
- **Semicolons:** at end of statements
- **Blank lines:** one between multi-line statements
- **No semicolon** on the closing `});` of the callback
- **Variable names:** camelCase, meaningful (not generic like `result1`)

Save to `/tmp/generated_input.js`.

## Step 5: Compile and Validate

### 5a. Compile the DSL

```bash
pushd $SDK_PKG
npx tsx -e "
  const { transpileWorkflowJS } = require('./src/simplified-compiler/compiler');
  const fs = require('fs');
  const input = fs.readFileSync('/tmp/generated_input.js', 'utf-8');
  const result = transpileWorkflowJS(input);
  if (result.errors.length > 0) {
    console.error(JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }
  console.log(result.code);
" > /tmp/compiled_output.js 2> /tmp/compile_errors.txt
popd
```

### 5b. Handle Compilation Errors

If compilation fails, read `/tmp/compile_errors.txt`, diagnose, fix the DSL in `/tmp/generated_input.js`, and retry. Common issues:

| Error | Fix |
|---|---|
| "No trigger callback found" | Ensure DSL starts with `onManual`/`onWebhook`/`onSchedule`/`onError` |
| "respond() can only be used inside onWebhook()" | Move `respond()` inside a webhook callback |
| Syntax error at line N | Check for unbalanced braces, missing semicolons |
| Unknown variable reference | Ensure variable is declared before use |

Iterate until compilation succeeds.

### 5c. Generate Workflow JSON (optional verification)

```bash
pushd $SDK_PKG
npx tsx -e "
  const { parseWorkflowCode } = require('./src/codegen/parse-workflow-code');
  const fs = require('fs');
  const code = fs.readFileSync('/tmp/compiled_output.js', 'utf-8');
  const workflow = parseWorkflowCode(code);
  console.log(JSON.stringify(workflow, null, 2));
" > /tmp/generated_workflow.json 2> /tmp/generate_errors.txt
popd
```

## Step 6: Report Results

```
## Generation Report

Template: {name} (ID: {id})
Source nodes: {totalCount}
  - Natively supported: {count}
  - Approximated: {count} ({list of original types})
  - Skipped: {count} ({list: stickyNote, noOp, aggregate, etc.})
  - Unsupported: {count} ({list with reasons})

Compilation: PASS / FAIL ({error count} errors)

Generated files:
  - DSL:      /tmp/generated_input.js
  - SDK:      /tmp/compiled_output.js
  - Workflow:  /tmp/generated_workflow.json (if generated)

Warnings:
  - {list of approximations and limitations}
```

## Step 7: Save as Fixture (Optional)

Only if the user explicitly asks to save as a fixture:

1. Find the next fixture number: scan `$FIXTURES_DIR/w*-*/` directories, find the highest `wNN` number, add 1
2. Create a descriptive directory name: `$FIXTURES_DIR/wNN-short-description/`
3. Save:
   - `meta.json`: `{ "title": "WNN: Description", "templateId": ID }`
   - `input.js`: the generated DSL from `/tmp/generated_input.js`
   - `output.js`: the compiled SDK from `/tmp/compiled_output.js`
4. Run `/validate-compiler-fixture wNN` to validate the new fixture

## Reference: Existing Fixture Patterns

Study these for style and pattern guidance:

| Fixture | Key Pattern |
|---|---|
| w01 | Schedule + sequential HTTP + bearer/oauth2 auth |
| w02 | Schedule cron + if/else with IO in both branches |
| w03 | Webhook + POST body + respond with headers |
| w05 | Schedule + for-of loop with IO (splitter + aggregate) |
| w07 | Schedule + for-of + try/catch + nested if/else inside loop |
| w08 | Webhook + Set vars + switch/case + ai.chat + respond |
| w10 | Helper function pattern + schedule + for-of |
| w13 | onError trigger + HTTP with basic auth |
| w14 | Webhook + switch/case + respond |
| w15 | Schedule + workflow.run (sub-workflows) |
| w16 | Webhook + ai.chat with tools + memory |
