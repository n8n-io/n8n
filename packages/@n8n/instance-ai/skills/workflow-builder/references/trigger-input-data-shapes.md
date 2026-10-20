---
name: trigger-input-data-shapes
description: >-
  Load before passing `inputData` to `workflow_builder_verify_built_workflow` or
  `workflow_builder_executions(action="run")`, to use the shape that matches the workflow's
  trigger type.
---
# Per-trigger `inputData` shape

Used by `workflow_builder_verify_built_workflow`, `workflow_builder_executions(action="run")`, checkpoint verification. Pin-data adapter spreads or wraps by trigger type. Wrong shape → null downstream values that look like expression bug.

## Form Trigger (`n8n-nodes-base.formTrigger`)

Flat field map, e.g. `{name: "Alice", email: "a@b.c"}`. Production Form Trigger emits each field directly on `$json`, so builder's `$json.<field>` expressions correct. **Do NOT wrap in `formFields`**: adapter rejects call.

## Webhook (`n8n-nodes-base.webhook`)

Body payload, e.g. `{event: "signup", userId: "..."}`. Adapter wraps under `body`, so downstream nodes reference `$json.body.<field>`.

## Chat Trigger (`@n8n/n8n-nodes-langchain.chatTrigger`)

`{chatInput: "user message"}`.

## Schedule Trigger (`n8n-nodes-base.scheduleTrigger`)

Omit `inputData`. Adapter emits synthetic timestamp fields.

## Other event triggers

Linear, GitHub, Slack, MCP, similar triggers: pass `inputData` matching trigger's expected payload shape from node type definition.

## Debugging wrong null values

**Do not patch workflow first when verify returns null downstream values.** Re-run verify with corrected `inputData` shape. Patch workflow only if expression wrong against *production* trigger output shape (consult node descriptions), not `instanceAi` pin data path.