---
name: config-eval-playbook
description: >-
  Load after config-evals when you need exact `eval-config` action fields,
  config shapes, or worked examples to list, create, change, run, or remove a
  config evaluation.
---
# Config Eval Playbook

Recipes + worked examples for `eval-config` tool. All actions discriminated by `action`, always take `workflowId`.

## Actions

| Action   | Purpose                                  | Extra fields |
| -------- | ---------------------------------------- | ------------ |
| `list`   | List config evals on workflow          | — |
| `get`    | Read one config eval                     | `configId` |
| `create` | Attach new config eval                 | config fields |
| `update` | Replace existing config eval          | `configId` + config fields |
| `delete` | Remove config eval                     | `configId` |

Config fields (create/update): `name`, `startNodeName`, `endNodeName`,
`dataTableId`, `metrics`.

`startNodeName` must be node **with incoming connection** — first node trigger feeds into, never trigger itself. Eval run replaces trigger with dataset-driven one, so trigger as start node fails compile. Single-agent workflow: `startNodeName` and `endNodeName` usually same agent node.

`create`, `update`, `delete` show approval card automatically. Call tool, act on result; no chat approval beforehand.

## Metric Fields

| Field          | Required                | Notes |
| -------------- | ----------------------- | ----- |
| `name`         | always                  | e.g. `"Correctness"` |
| `preset`       | always                  | `correctness` or `helpfulness` |
| `credentialId` | always                  | judge model credential id; also determines provider |
| `model`        | always                  | model ID supported by judge credential |
| `outputType`   | defaults to `numeric`   | `numeric` or `boolean` |
| `actualAnswer` | always                  | expression for produced answer, e.g. `={{ $json.output }}` |
| `expectedAnswer` | `correctness` preset  | expression for ground truth, e.g. `={{ $json.expected_output }}` |
| `userQuery`    | `helpfulness` preset    | expression for user query, e.g. `={{ $json.input }}` |
| `prompt`       | optional                | overrides default judge prompt |
| `provider`     | omit                    | chat-model node type; leave unset — derived from `credentialId`. Set only if known (e.g. `@n8n/n8n-nodes-langchain.lmChatOpenAi`) |

`actualAnswer`, `expectedAnswer`, `userQuery` are expressions, **must
begin with `=`** (e.g. `={{ $json.output }}`). Without `=` value stored as literal text; judge scores `{{ $json.output }}` verbatim, not resolved output. Omit `=` only for genuinely fixed constant string.

## Worked Example — correctness eval on an agent workflow

1. Ensure dataset exists with input column + ground-truth column:

   ```
   data_tables(action="list")
   // if none fits:
   data_tables(action="create", name="Support agent eval dataset",
     columns=[{ name: "input", type: "string" },
              { name: "expected_output", type: "string" }])
   // then seed rows:
   data_tables(action="insert-rows", dataTableId="<id>",
     rows=[{ input: "...", expected_output: "..." }])
   ```

2. Create config eval, link dataset by id:

   ```
   eval-config(
     action="create",
     workflowId="<wf_id>",
     name="Support agent correctness",
     startNodeName="AI Agent",        // first node after the trigger — not the trigger itself
     endNodeName="AI Agent",
     dataTableId="<dt_id>",
     metrics=[{
       name: "Correctness",
       preset: "correctness",
       credentialId: "<cred_id>",   // provider is derived from this credential
       model: "<model_id>",
       actualAnswer: "={{ $json.output }}",
       expectedAnswer: "={{ $json.expected_output }}"
     }]
   )
   ```

3. Report: eval name, workflow, start/end nodes, dataset name + id, metric.

## Worked Example — helpfulness eval (no ground truth)

Use `helpfulness` when no single correct answer. Dataset needs only input column; no ground-truth column.

```
eval-config(
  action="create",
  workflowId="<wf_id>",
  name="Assistant helpfulness",
  startNodeName="AI Agent",        // first node after the trigger — not the trigger itself
  endNodeName="AI Agent",
  dataTableId="<dt_id>",
  metrics=[{
    name: "Helpfulness",
    preset: "helpfulness",
    credentialId: "<cred_id>",   // provider is derived from this credential
    model: "<model_id>",
    userQuery: "={{ $json.input }}",
    actualAnswer: "={{ $json.output }}"
  }]
)
```

## Changing or Removing

- Change metrics, nodes, or dataset: `update` with `configId` from
  `list`/`get`. `update` replaces full config — resend every field to keep, not only changed ones.
- Read current state before edit: `get` with `configId`.
- Remove eval: `delete` with `configId`.

## Boundary Reminder

Tool never touches canvas. No EvaluationTrigger or Evaluation nodes; config evals attached via evaluation-config API only. Build + seed datasets only via `data_tables` tool.