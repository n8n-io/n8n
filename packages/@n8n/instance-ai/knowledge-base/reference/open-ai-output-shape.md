# OpenAI node output shape

Node type: `@n8n/n8n-nodes-langchain.openAi`

Use this when mapping downstream fields from an OpenAI node with `$json.<field>` or
`$('NodeName').item.json.<field>`. Output shape depends on resource, operation,
and simplify settings — consult `nodes(action="type-definition")` when in doubt.

## Text → Response (`resource: text`, `operation: response`)

Default **Simplify Output** is `true`. The node emits:

```json
{
  "output": [
    {
      "type": "message",
      "content": [{ "type": "output_text", "text": "..." }]
    }
  ]
}
```

Read the assistant message with **`$json.output[0].content[0].text`**. Do not use
`$json.text` — that field does not exist on this output.

When the downstream node has a different immediate upstream (e.g. Google Sheets
after OpenAI, with form fields from an earlier node), use an explicit node
reference:

`={{ $('Generate Confirmation').first().json.output[0].content[0].text }}`

## Text → Message (`resource: text`, `operation: message`)

With simplify enabled (default), each choice object is emitted at the root of
`$json` (fields such as `message`, `index`, `finish_reason`). Read assistant
content from **`$json.message.content`**, not `$json.text`.
