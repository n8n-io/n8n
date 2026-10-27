---
name: trigger-input-data-shapes
description: >-
  Load before passing `inputData` to `workflow_builder_verify_built_workflow` or
  `workflow_builder_executions(action="run")`, to use the shape that matches the workflow's
  trigger type.
---
# Per-trigger `inputData` shape

Used by `workflow_builder_verify_built_workflow` and `workflow_builder_executions(action="run")`. Pin-data adapter spread or wrap by trigger type — wrong shape give null downstream values that look like expression bug.

## Form Trigger (`n8n-nodes-base.formTrigger`)

Flat field map, e.g. `{name: "Alice", email: "a@b.c"}`. Production Form Trigger emit each field direct on `$json`, so builder `$json.<field>` expressions correct. **Do NOT wrap in `formFields`** — adapter reject call.

## Webhook (`n8n-nodes-base.webhook`)

Body payload, e.g. `{event: "signup", userId: "..."}`. Adapter wrap under `body`, so downstream nodes reference `$json.body.<field>`.

## Chat Trigger (`@n8n/n8n-nodes-langchain.chatTrigger`)

`{chatInput: "user message"}`.

## Schedule Trigger (`n8n-nodes-base.scheduleTrigger`)

Omit `inputData`; adapter emit synthetic timestamp fields.

## Other event triggers

Linear, GitHub, Slack, MCP, similar triggers: pass `inputData` matching trigger expected payload shape from node type definition.

## Debugging wrong null values

**Do not patch workflow first when verify return null downstream values.** Re-run verify with corrected `inputData` shape. Only patch workflow if expression wrong against *production* trigger output shape (check node descriptions), not `instanceAi` pin data path.