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
  - data-tables
platforms:
  - daytona
---

# Config-based Evaluations

Use this skill to attach a configuration-based evaluation to a workflow with the
`eval-config` tool. A config eval pairs a workflow with a name, a start node, an
end node, one or more judged metrics, and a Data Table dataset. Nothing is added
to the canvas — the config lives off-canvas via the evaluation-config API.

Config evals are the only evaluation form you work with. Do not add, read,
rewire, or reason about on-canvas evaluation nodes (EvaluationTrigger,
Evaluation/checkIfEvaluating/setOutputs/setMetrics). If the user asks for those,
build a config eval instead and briefly say that is how you set up evaluations.

## What a Config Eval Needs

- `name` — a human-readable evaluation name.
- `startNodeName` — the node where a run begins; it is fed one test-input row.
- `endNodeName` — the node whose output is judged.
- `dataTableId` — a Data Table holding the test dataset. Create and populate it
  with the `data-tables` tool first, then link it here by id.
- `metrics` — one or more judged metrics (see below).

## Default Procedure

1. Identify the target workflow and read it. Trace the main path from trigger to
   the node that produces the answer.
2. Pick the nodes:
   - `startNodeName` is normally the node that receives the input the dataset
     varies (often the trigger or the first node after it).
   - `endNodeName` is the node whose output you want scored (usually the AI agent
     or the final response node).
3. Resolve the dataset. Call `data-tables(action="list")` to find an existing
   dataset, or create and seed one with `data-tables` before creating the config.
   Never invent a `dataTableId`; use one returned by `data-tables`.
4. Choose metrics and build the `actualAnswer` / `expectedAnswer` / `userQuery`
   expressions (see Metrics).
5. Call `eval-config` (`action="create"`), or `update` when changing an existing
   config. The tool shows an approval card automatically — call it and respect
   the result; do not ask for chat approval first.
6. Close with facts: evaluation name, workflow, start/end nodes, dataset name and
   id, and the metrics configured.

## Metrics

Each metric is LLM-judged and needs a judge model: `provider`, `credentialId`,
`model`, and `outputType` (`numeric`, the default, or `boolean`). Reuse an LLM
credential the workflow already uses when one fits. Two presets are available:

- **`correctness`** — compares the produced answer to a ground-truth answer.
  Requires `expectedAnswer` (an n8n expression resolving to the ground-truth
  value, typically a dataset column, e.g. `{{ $json.expected_output }}`).
- **`helpfulness`** — judges the produced answer against the user's query.
  Requires `userQuery` (an n8n expression for the input the user asked, e.g.
  `{{ $json.input }}`).

Every metric also needs `actualAnswer`: an n8n expression resolving to the
workflow's produced answer at the end node, e.g. `{{ $json.output }}`.

Pick `correctness` when the dataset has a known right answer to compare against;
pick `helpfulness` when there is no single ground truth and quality is judged
relative to the request. Use `prompt` only to override the default judge prompt.

## Dataset Boundary

- Build the dataset with the `data-tables` tool: one column for each input the
  evaluation varies, plus a ground-truth column when using `correctness`.
- The config only references the dataset by `dataTableId`; the `eval-config` tool
  does not create or populate rows. If no suitable dataset exists, create one
  first, then create the config.
- Do not weaken the evaluation to fit a thin dataset — seed the dataset to match
  the metrics, or ask the user for the expected answers.

## More Detail

Use [references/config-eval-playbook.md](references/config-eval-playbook.md) for
tool-call recipes, worked examples, and output shapes.
