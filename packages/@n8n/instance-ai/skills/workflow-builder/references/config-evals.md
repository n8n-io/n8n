---
name: config-evals
description: >-
  Builds and maintains configuration-based evaluations on a workflow with the
  eval-config tool. Use when the user asks to set up, add, view, change, or
  remove an evaluation, score, grade, or judge a workflow's output, or measure
  answer quality against a test dataset. This is the only eval form Instance AI
  handles — it does not touch on-canvas evaluation nodes.
recommended_tools:
  - eval-config
  - data_tables
platforms:
  - daytona
---
# Config-based Evaluations

Skill attach config-based eval to workflow via `eval-config` tool. Config eval pair workflow with name, start node, end node, one or more judged metrics, Data Table dataset. Nothing added to canvas — config live off-canvas via evaluation-config API.

Config evals only eval form you use. No add, read, rewire, or reason about on-canvas eval nodes (EvaluationTrigger, Evaluation/checkIfEvaluating/setOutputs/setMetrics). User ask for those → build config eval instead, briefly say that how you set up evals.

## What a Config Eval Needs

- `name` — human-readable eval name.
- `startNodeName` — node where run begin; fed one test-input row.
  Must have incoming connection — **never a trigger** (see step 2).
- `endNodeName` — node whose output judged.
- `dataTableId` — Data Table holding test dataset. Create + populate with
  `data_tables` tool first, then link here by id.
- `metrics` — one or more judged metrics (see below).

## Default Procedure

1. Identify target workflow, read it. Trace main path from trigger to
   node producing answer.
2. Pick nodes:
   - `startNodeName` = first node **after** trigger — node that
     receives the input the dataset varies. Never use the trigger itself: an
     eval run swaps the trigger for a dataset-driven one, so the start node must
     have an incoming connection or the run fails to compile. For a chat/agent
     workflow this is usually the agent node (often the same as `endNodeName`).
   - `endNodeName` = node whose output you want scored (usually AI agent
     or the final response node).
3. Resolve dataset. Call `data_tables(action="list")` to find existing
   dataset, or create + seed one with `data_tables` before creating config.
   Never invent `dataTableId`; use one returned by `data_tables`.
4. Choose metrics, build `actualAnswer` / `expectedAnswer` / `userQuery`
   expressions (see Metrics).
5. Call `eval-config` (`action="create"`), or `update` when changing existing
   config. Tool show approval card automatically — call it, respect
   result; no ask chat approval first.
6. Close with facts: eval name, workflow, start/end nodes, dataset name +
   id, metrics configured.

## Metrics

Each metric LLM-judged, need judge model: `credentialId`, `model`,
`outputType` (`numeric`, default, or `boolean`). Reuse LLM
credential workflow already use when fits.

**No** set `provider` unless you know exact chat-model node type — 
derived automatically from credential passed (each credential type map to
one provider). Just pick credential + model.

Two presets:

- **`correctness`** — compare produced answer to ground-truth answer.
  Require `expectedAnswer` (n8n expression resolving to ground-truth
  value, typically dataset column, e.g. `={{ $json.expected_output }}`).
- **`helpfulness`** — judge produced answer against user's query.
  Require `userQuery` (n8n expression for user input, e.g.
  `={{ $json.input }}`).

Every metric also need `actualAnswer`: n8n expression resolving to
workflow's produced answer at end node, e.g. `={{ $json.output }}`.

`userQuery` and `expectedAnswer` name **dataset columns** (user input;
ground-truth answer). `actualAnswer` name field of workflow's
**produced output**. Write all as `={{ $json.<name> }}` — eval
read dataset columns from dataset row and `actualAnswer` from end node
automatically. No reference trigger or any node by name.

### Expression fields must begin with `=`

`actualAnswer`, `userQuery`, `expectedAnswer` are n8n **expressions** — 
read value from each test row at runtime. Leading `=` tell n8n
evaluate `{{ … }}` template. **Without it string stored as literal
text**: field show `{{ $json.output }}` verbatim, judge score
raw string instead of resolved value.

- Correct: `={{ $json.output }}`, `={{ $json.expected_output }}`
- Wrong: `{{ $json.output }}` (no `=` → treated as fixed text)

Only add `=` when value reference workflow data via `{{ … }}`. True
fixed constant (rare for these fields) written plain text, no `=`.

Pick `correctness` when dataset has known right answer to compare;
pick `helpfulness` when no single ground truth, quality judged
relative to request. Use `prompt` only to override default judge prompt.

## Dataset Boundary

- Build dataset with `data_tables` tool: one column per input
  eval varies, plus ground-truth column when using `correctness`.
- Config only reference dataset by `dataTableId`; `eval-config` tool
  no create or populate rows. No suitable dataset → create one
  first, then create config.
- No weaken eval to fit thin dataset — seed dataset to match
  metrics, or ask user for expected answers.

## More Detail

Load `config-eval-playbook` reference for tool-call recipes, worked
examples, output shapes.