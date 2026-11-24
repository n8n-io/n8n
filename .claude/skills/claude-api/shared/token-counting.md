# Token Counting

Use the `count_tokens` endpoint (`POST /v1/messages/count_tokens`) for accurate
token counts against Claude models. Token counts are **model-specific** - pass
the same model ID you'll use for inference.

**Do not use `tiktoken`.** It's OpenAI's tokenizer. It undercounts Claude
tokens by ~15-20% on typical text, and by much more on code or non-English
input. Any estimate from `tiktoken`, `gpt-tokenizer`, or similar is wrong for
Claude.

## Count a file or string

```python
from anthropic import Anthropic

client = Anthropic()
resp = client.messages.count_tokens(
    model="claude-opus-5-5",
    messages=[{"role": "user", "content": open("CLAUDE.md").read()}],
)
print(resp.input_tokens)
```

TypeScript: `await client.messages.countTokens({model, messages})` ->
`.input_tokens`. See `{lang}/claude-api/README.md` for other SDKs.

## CLI

```sh
ant messages count-tokens --model claude-opus-5-5 \
  --message '{role: user, content: "@./CLAUDE.md"}' \
  --transform input_tokens -r
```

## Diffing a file across two versions

The endpoint is stateless - count each version separately and subtract:

```python
from anthropic import Anthropic
import subprocess

client = Anthropic()
def count(text: str) -> int:
    return client.messages.count_tokens(
        model="claude-opus-5-5",
        messages=[{"role": "user", "content": text}],
    ).input_tokens

before = subprocess.check_output(["git", "show", "HEAD:CLAUDE.md"], text=True)
after = open("CLAUDE.md").read()
print(count(after) - count(before))
```

Full docs: see the Token Counting entry in `shared/live-sources.md`.
