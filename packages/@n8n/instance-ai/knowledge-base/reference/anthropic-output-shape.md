# Anthropic node output shape

Node type: `@n8n/n8n-nodes-langchain.anthropic`

Use this when mapping downstream fields from an Anthropic node with
`$json.<field>` or `$('NodeName').item.json.<field>`, or when parsing its
output in a Code node.

## Text → Message (`resource: text`, `operation: message`)

With **Simplify Output** enabled (default), the node emits:

```json
{
  "content": [
    { "type": "text", "text": "..." }
  ],
  "merged_response": "..."
}
```

**`$json.content` is an ARRAY of content blocks, not a string.** Read the
assistant text with **`$json.content[0].text`** — never treat `$json.content`
itself as the reply string.

`merged_response` is only present when the node option **Include Merged
Response** is enabled; when it is, `$json.merged_response` is all `text`
blocks joined into one string and is the simplest field to consume downstream.

### Parsing model-generated JSON in a Code node

When you ask the model to reply with JSON, the JSON string lives inside the
text block. Parse `content[0].text`, not `content`:

```javascript
// Correct
const parsed = JSON.parse($json.content[0].text);

// Wrong — content is an array of blocks, JSON.parse will throw
const parsed = JSON.parse($json.content);
```

Models often wrap JSON in markdown fences even when told not to; strip them
defensively before parsing:

```javascript
const raw = $json.content[0].text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
const parsed = JSON.parse(raw);
```

### Caveats

- **`[0]` is a convenience, not universal.** `content` can contain multiple
  blocks (e.g. after tool use, or `thinking` blocks when extended thinking is
  enabled). Pick the block with `type: "text"` that matches what you need, or
  enable Include Merged Response and read `merged_response`.
- **`simplify: false`**: `$json` is the full Messages API response (`id`,
  `role`, `model`, `content`, `stop_reason`, `usage`, …). Assistant text is
  still at `$json.content[0].text`.
- **No response-format option.** Unlike the OpenAI node, the Anthropic node
  has no `json_object`/`json_schema` output mode — JSON replies always arrive
  as a string inside a text block and must be parsed by you.
