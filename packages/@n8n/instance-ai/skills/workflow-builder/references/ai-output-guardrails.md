# Workflow Builder AI Output Guardrails

Use these rules when an LLM Chain, AI Agent, OpenAI text/response node, or
other AI summarizer/extractor feeds a final email, Slack/Telegram post, webhook
response, create/update, or formatter.

## Normalize AI Output Before Effects

Do not guess the final action payload from common names such as `$json.text`,
`$json.content`, or `$json.message` after an AI node. Inspect the node family
and normalize the generated value into a stable field such as `$json.digestHtml`,
`$json.summary`, or `$json.actionItems` before a terminal action reads it.

## LLM Chain Output

LLM Chain nodes output generated text at `$json.text`. They do not produce a
`$json.response.text` envelope unless you created that object yourself.

Prefer:

1. LLM Chain emits `$json.text`.
2. Code or Set/Edit Fields copies it to a named field.
3. Final Slack/Gmail/etc. reads the named field from its immediate upstream
   item.

## OpenAI Responses Output

OpenAI `text/response` with simplified output stores generated content under
`$json.output[0].content[0].text`, not a top-level `$json.text`,
`$json.content`, or `$json.message`.

When using JSON schema output, that nested `text` value may already be an
object. Guard parsing:

```js
const value = $json.output?.[0]?.content?.[0]?.text;
const parsed = typeof value === 'string' ? JSON.parse(value) : value;
```

Then normalize the parsed data into fields the final action can read.

## OpenAI Prompt Expressions

For OpenAI `text/response` prompt fields, do not mix a leading literal
expression marker with interpolation such as `=Here are {{ $json.emailCount }}
emails`. Use one full expression, or build the prompt upstream:

```ts
expr('{{ "Here are " + $json.emailCount + " emails\\n\\n" + $json.emailsText }}')
```

or:

```ts
expr('{{ $json.prompt }}')
```
