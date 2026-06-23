# Expression Reference

Available variables inside `expr('{{ ... }}')`:

- `$json`: current item's JSON data from the immediate predecessor node only.
- `$('NodeName').item.json`: access another node's output item paired with the
  current item.
- `$input.first()`, `$input.all()`, and `$input.item`.
- `$binary`: binary data from the current item.
- `$now` and `$today`: Luxon date/time helpers.
- `$itemIndex`, `$runIndex`, `$execution.id`, `$execution.mode`,
  `$workflow.id`, and `$workflow.name`.

Variables must always be inside `{{ }}`:

```ts
expr('Hello {{ $json.name }}')
expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')
expr('{{ $("Source").all().map(i => ({ option: i.json.name })) }}')
```

When `$json` is unsafe, reference the source node explicitly. This matters for
AI Agent subnodes, fan-in nodes after IF/Switch/Merge, and values that come from
further upstream or from before a node that replaces item JSON:

```ts
sessionKey: nodeJson(telegramTrigger, 'message.chat.id')
eventId: nodeJson(extractEventId, 'eventId')
```

Use `$('NodeName').item.json.field` or `nodeJson(sourceNode, 'field')` for
per-item upstream values. Do not use `.first()` or `$input.first()` for
per-item data in a multi-item workflow; it always reads item 0 and makes every
downstream item reuse the first value. Use `.first()` only for a true global
first item, such as a single configuration row.
