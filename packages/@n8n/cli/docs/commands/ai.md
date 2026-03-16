# ai

Chat with the n8n instance AI agent and manage conversation threads.

## `ai chat`

Send a message to the instance AI agent, with streaming responses.

### Single-shot mode

```bash
n8n-cli ai chat "list my workflows"
n8n-cli ai chat "why did execution 1234 fail?" --format=json
n8n-cli ai chat "summarize this" --file=context.md
n8n-cli ai chat --thread=abc-123 "follow up question"
n8n-cli ai chat "deep analysis" --research
```

### Interactive mode

Start an interactive chat session (omit the message argument):

```bash
n8n-cli ai chat
```

This opens a REPL where you can send multiple messages in the same thread. Text output streams to stdout; status messages go to stderr. Press `Ctrl+C` to exit.

| Flag | Description |
|------|-------------|
| `--thread` | Resume an existing thread by ID |
| `--file` | Attach file contents as context |
| `--research` | Enable research mode for deeper analysis |

### Output

- **Default (table/text)**: Streams text deltas to stdout as they arrive. Tool calls and agent status print to stderr.
- **`--format=json`**: Outputs NDJSON (one JSON event per line) for programmatic consumption.

### Confirmation requests

When the AI agent requests confirmation for a destructive action, the CLI auto-approves and prints a warning to stderr. This is designed for non-interactive scripting.

## `ai threads`

List AI conversation threads.

```bash
n8n-cli ai threads
n8n-cli ai threads --format=json
n8n-cli ai threads --limit=50
```

| Flag | Description |
|------|-------------|
| `--limit` | Maximum number of threads (default: 20) |
