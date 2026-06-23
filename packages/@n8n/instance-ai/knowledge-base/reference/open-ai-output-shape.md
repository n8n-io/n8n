# OpenAI node output shape

Node type: `@n8n/n8n-nodes-langchain.openAi` (default type version **2.3**)

Use this when mapping downstream fields from an OpenAI node with `$json.<field>` or
`$('NodeName').item.json.<field>`. Output shape depends on **node type version**,
resource, operation, and simplify settings — consult `nodes(action="type-definition")`
when in doubt.

## Version and operation

| Node version | Text operation | API |
| --- | --- | --- |
| **v2+** (default) | `response` | OpenAI Responses API |
| **v1.x** | `message` | Chat Completions API |

On v2+, `operation: message` is invalid. Prefer v2 with `operation: response` for
new workflows. The sections below match the operation for each version.

Default **Simplify Output** is `true` on both paths unless noted otherwise.

## Text → Response — v2+ (`resource: text`, `operation: response`)

With simplify enabled (default), the node emits only `message`-type output items:

```json
{
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [{ "type": "output_text", "text": "..." }]
    }
  ]
}
```

For a simple single-message text reply, read the assistant text with
**`$json.output[0].content[0].text`**. Do not use `$json.text` — that field does
not exist on this output.

When the downstream node has a different immediate upstream (e.g. Google Sheets
after OpenAI, with form fields from an earlier node), use an explicit node
reference:

`={{ $('Generate Confirmation').first().json.output[0].content[0].text }}`

### Caveats (response)

- **`[0]` is a convenience, not universal.** Simplified `output` can contain
  multiple `message` items, and each message can have multiple `content` parts.
  Pick the index that matches the text you need.
- **Structured / JSON output** (`text.format.type` of `json_object` or
  `json_schema`): `content[].text` is parsed into an **object**, not a string.
- **`simplify: false`**: `$json` is the full Responses API payload (`id`, `status`,
  `output`, `usage`, …). Message text is still under `output`, but `output` may
  also include non-message items (reasoning, tool calls, etc.).
- **Tool-heavy runs**: if no `message`-type item exists, `output[0]` may be wrong
  or missing — inspect `$json.output` or disable simplify.

## Text → Message — v1.x only (`resource: text`, `operation: message`)

With simplify enabled (default), each choice object is emitted at the root of
`$json` (fields such as `message`, `index`, `finish_reason`). Read assistant
content from **`$json.message.content`**, not `$json.text`.

`message.content` is a **string** for plain text replies.

### Caveats (message)

- **v1 only.** Do not use this section when configuring or referencing v2 nodes.
- **Output Content as JSON** enabled: `message.content` may be a parsed **object**,
  not a string.
- **`simplify: false`**: `$json` is the full completion (`choices`, `usage`, …).
  Read text from `$json.choices[0].message.content`.
- **Multiple choices** (`n` > 1): the node emits one item per choice; each item
  has its own `$json.message`.
- **Tool calls**: `message.content` may be empty and `message.tool_calls` may be
  populated instead.
