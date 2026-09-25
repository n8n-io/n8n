# Per-trigger `inputData` shape

Used by `verify-built-workflow`, `executions(action="run")`, and checkpoint
verification. The pin-data adapter spreads or wraps based on trigger type —
passing the wrong shape gives null downstream values that look like an
expression bug.

## Form Trigger (`n8n-nodes-base.formTrigger`)

Flat field map, e.g. `{name: "Alice", email: "a@b.c"}`. The production Form
Trigger emits each field directly on `$json`, so the builder's `$json.<field>`
expressions are correct. **Do NOT wrap in `formFields`** — the adapter will
reject the call.

## Webhook (`n8n-nodes-base.webhook`)

The body payload, e.g. `{event: "signup", userId: "..."}`. The adapter wraps it
under `body`, so downstream nodes reference `$json.body.<field>`.

## Chat Trigger (`@n8n/n8n-nodes-langchain.chatTrigger`)

`{chatInput: "user message"}`.

## Schedule Trigger (`n8n-nodes-base.scheduleTrigger`)

Omit `inputData`; the adapter emits synthetic timestamp fields.

## Other event triggers

Linear, GitHub, Slack, MCP, and similar triggers: pass `inputData` matching the
trigger's expected payload shape from the node type definition.

## Debugging wrong null values

**Do not patch a workflow first when verify returns null downstream values.**
Re-run verify with the corrected `inputData` shape. Only patch the workflow if
the expression is wrong against the *production* trigger output shape (consult
node descriptions), not the `instanceAi` pin data path.
