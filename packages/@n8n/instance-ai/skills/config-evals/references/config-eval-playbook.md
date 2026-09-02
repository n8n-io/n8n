# Config Eval Playbook

Recipes and worked examples for the `eval-config` tool. All actions are
discriminated by `action` and always take a `workflowId`.

## Actions

| Action   | Purpose                                  | Extra fields |
| -------- | ---------------------------------------- | ------------ |
| `list`   | List config evals on a workflow          | — |
| `get`    | Read one config eval                     | `configId` |
| `create` | Attach a new config eval                 | config fields |
| `update` | Replace an existing config eval          | `configId` + config fields |
| `delete` | Remove a config eval                     | `configId` |

Config fields (create/update): `name`, `startNodeName`, `endNodeName`,
`dataTableId`, `metrics`.

`startNodeName` must be a node **with an incoming connection** — the first node
the trigger feeds into, never the trigger itself. An eval run replaces the
trigger with a dataset-driven one, so naming the trigger as the start node fails
to compile. For a single-agent workflow, `startNodeName` and `endNodeName` are
usually the same agent node.

`create`, `update`, and `delete` show an approval card automatically. Call the
tool and act on the result; do not ask for chat approval beforehand.

## Metric Fields

| Field          | Required                | Notes |
| -------------- | ----------------------- | ----- |
| `name`         | always                  | e.g. `"Correctness"` |
| `preset`       | always                  | `correctness` or `helpfulness` |
| `credentialId` | always                  | credential id for the judge model; also determines the provider |
| `model`        | always                  | e.g. `gpt-4o` |
| `outputType`   | defaults to `numeric`   | `numeric` or `boolean` |
| `actualAnswer` | always                  | expression for the produced answer, e.g. `={{ $json.output }}` |
| `expectedAnswer` | `correctness` preset  | expression for ground truth, e.g. `={{ $json.expected_output }}` |
| `userQuery`    | `helpfulness` preset    | expression for the user's query, e.g. `={{ $json.input }}` |
| `prompt`       | optional                | overrides the default judge prompt |
| `provider`     | omit                    | chat-model node type; leave unset — derived from `credentialId`. Set only if you know it (e.g. `@n8n/n8n-nodes-langchain.lmChatOpenAi`) |

`actualAnswer`, `expectedAnswer`, and `userQuery` are expressions and **must
begin with `=`** (e.g. `={{ $json.output }}`). Without the `=` the value is stored
as literal text and the judge scores `{{ $json.output }}` verbatim instead of the
resolved output. Only omit `=` for a genuinely fixed constant string.

## Worked Example — correctness eval on an agent workflow

1. Ensure a dataset exists with an input column and a ground-truth column:

   ```
   data-tables(action="list")
   // if none fits:
   data-tables(action="create", name="Support agent eval dataset",
     columns=[{ name: "input", type: "string" },
              { name: "expected_output", type: "string" }])
   // then seed rows with data-tables insert
   ```

2. Create the config eval, linking the dataset by id:

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
       model: "gpt-4o",
       actualAnswer: "={{ $json.output }}",
       expectedAnswer: "={{ $json.expected_output }}"
     }]
   )
   ```

3. Report: evaluation name, workflow, start/end nodes, dataset name + id, metric.

## Worked Example — helpfulness eval (no ground truth)

Use `helpfulness` when there is no single correct answer. The dataset needs only
the input column; no ground-truth column is required.

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
    model: "claude-sonnet-4-5",
    userQuery: "={{ $json.input }}",
    actualAnswer: "={{ $json.output }}"
  }]
)
```

## Changing or Removing

- To change metrics, nodes, or the dataset, use `update` with the `configId` from
  `list`/`get`. `update` replaces the full config — resend every field you want
  to keep, not only the changed ones.
- To read current state before editing, use `get` with the `configId`.
- To remove an eval, use `delete` with the `configId`.

## Boundary Reminder

This tool never touches the canvas. Do not add EvaluationTrigger or Evaluation
nodes; config evals are attached through the evaluation-config API only. Build
and seed datasets exclusively through the `data-tables` tool.
