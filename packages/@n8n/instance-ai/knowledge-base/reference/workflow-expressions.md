# Workflow expression reference

Variables and patterns for `expr('{{ ... }}')` and explicit node references.
Read when expressions span IF/Switch/Merge fan-in, AI Agent subnodes, or nodes
after side-effect nodes.

## Contents

- Available variables
- Basic examples
- Explicit node references
- Per-item vs first-item access

## Available variables

Inside `expr('{{ ... }}')`:

- `$json`: current item's JSON data from the immediate predecessor node only.
- `$('NodeName').item.json`: access another node's output item paired with the
  current item.
- `$input.first()`, `$input.all()`, and `$input.item`.
- `$binary`: binary data from the current item.
- `$now` and `$today`: Luxon date/time helpers.
- `$itemIndex`, `$runIndex`, `$execution.id`, `$execution.mode`,
  `$workflow.id`, and `$workflow.name`.

Variables must always be inside `{{ }}`.

## Basic examples

```ts
expr('Hello {{ $json.name }}')
expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')
expr('{{ $("Source").all().map(i => ({ option: i.json.name })) }}')
```

## Explicit node references

When `$json` is unsafe, reference the source node explicitly. This matters for
AI Agent subnodes, fan-in nodes after IF/Switch/Merge, and values that come from
further upstream or from before a node that replaces item JSON:

```ts
sessionKey: nodeJson(telegramTrigger, 'message.chat.id')
eventId: nodeJson(extractEventId, 'eventId')
```

## Per-item vs first-item access

Use `$('NodeName').item.json.field` or `nodeJson(sourceNode, 'field')` for
per-item upstream values. Do not use `.first()` or `$input.first()` for per-item
data in a multi-item workflow; it always reads item 0 and makes every downstream
item reuse the first value. Use `.first()` only for a true global first item,
such as a single configuration row.
