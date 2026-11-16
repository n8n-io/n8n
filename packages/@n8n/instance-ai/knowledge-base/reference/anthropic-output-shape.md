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

**`$json.content` is an ARRAY of content blocks, not a string.** Never treat
`$json.content` itself as the reply string.

**`content[0]` is not guaranteed to be a text block.** The array is passed
through from the Messages API unfiltered: with **Web Search** or **Code
Execution** enabled it also contains `server_tool_use` and
`*_tool_result` blocks, and citations can split the answer across multiple
`text` blocks. Read the assistant text with one of:

- **`$json.merged_response`** — all `text` blocks joined into one string; the
  simplest field to consume downstream. Only present when the node option
  **Include Merged Response** is enabled, so prefer enabling it.
- **`$json.content.find(c => c.type === 'text')?.text`** — the first text
  block, safe regardless of node options. Keep the `?.`: a turn can end with
  no text block at all (e.g. cut off mid-tool-use by the iteration cap or
  `max_tokens`).
- `$json.content[0].text` — only safe in the plain default configuration
  (no web search / code execution).

### Parsing model-generated JSON in a Code node

When you ask the model to reply with JSON, the JSON string lives inside a
text block. Parse the text block's `text`, not `content`:

```javascript
// Correct
const text = $json.content.find((c) => c.type === 'text')?.text;
if (!text) throw new Error('Model returned no text block');
const parsed = JSON.parse(text);

// Wrong — content is an array of blocks, JSON.parse will throw
const parsed = JSON.parse($json.content);
```

Models often wrap JSON in markdown fences even when told not to; strip them
defensively before parsing:

```javascript
const text = $json.content.find((c) => c.type === 'text')?.text ?? '';
const raw = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
const parsed = JSON.parse(raw);
```

### Caveats

- **`simplify: false`**: `$json` is the full Messages API response (`id`,
  `role`, `model`, `content`, `stop_reason`, `usage`, …). The `content` array
  has the same shape and the same non-text-block caveats as above.
- **No response-format option.** Unlike the OpenAI node, the Anthropic node
  has no `json_object`/`json_schema` output mode — JSON replies always arrive
  as a string inside a text block and must be parsed by you.
