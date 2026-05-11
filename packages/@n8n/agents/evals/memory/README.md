# n8n Memory Evals

Stateful real-model evals for the n8n agent memory stack.

These evals are intentionally not a CI gate. They measure whether the current SDK memory behavior helps across realistic support-style conversations:

- `<agent-profile>`: durable persona, role, and operating style for this agent.
- `<user-profile>`: stable user/resource preferences and context.
- `<session-memory>`: current-thread objective, state, decisions, and follow-ups.
- `<memory>`: source-backed episodic Case memory entries retrieved for the turn.

The runner uses the production SDK paths: `Memory.profiles(...)`, `Memory.episodicMemory(...)`, `InMemoryMemory`, real profile updates, real episodic extraction, auto-injection, and the built-in `recall_memory` tool.

The full suite contains 50 scenarios. The smoke suite keeps the first five scenarios stable so local checks stay cheap.

## Requirements

```bash
N8N_AI_ANTHROPIC_KEY=...
N8N_AI_OPENAI_API_KEY=...
```

Optional:

```bash
N8N_MEMORY_EVAL_AGENT_MODEL=anthropic/claude-haiku-4-5
N8N_MEMORY_EVAL_LIMIT=5
N8N_MEMORY_EVAL_CATEGORY=case-extraction
N8N_MEMORY_EVAL_REPEATS=3
N8N_MEMORY_EVAL_JUDGE=1
N8N_MEMORY_EVAL_JUDGE_MODEL=anthropic/claude-haiku-4-5
```

## Commands

From the repo root:

```bash
(
  set -a
  source .env
  set +a

  cd packages/@n8n/agents
  pnpm exec tsx evals/memory/run.ts --validate-only
)
```

Smoke run:

```bash
(
  set -a
  source .env
  set +a

  cd packages/@n8n/agents
  pnpm exec tsx evals/memory/run.ts --suite smoke --limit 5
)
```

Full run:

```bash
(
  set -a
  source .env
  set +a

  cd packages/@n8n/agents
  pnpm exec tsx evals/memory/run.ts --suite full --repeats 3
)
```

Full run with LLM judge:

```bash
(
  set -a
  source .env
  set +a

  cd packages/@n8n/agents
  pnpm exec tsx evals/memory/run.ts --suite full --repeats 3 --judge
)
```

Threshold-gated run:

```bash
pnpm exec tsx evals/memory/run.ts --suite full --repeats 3 --enforce-thresholds
```

## Output

Runs write local artifacts under:

```text
packages/@n8n/agents/evals/memory/results/run-<timestamp>/
```

The directory is gitignored and contains:

- `raw-results.json`: every scenario turn, answer, profiles, session memory, entries, retrieval output, tool usage, deterministic scoring checks, optional judge score, latency, and available token usage.
- `summary.json`: aggregate metrics, repeat summaries, and optional judge rates.
- `summary.md`: compact human-readable report.

## Scoring

Scoring is deterministic by default:

- expected and forbidden keywords in profiles, session memory, entries, retrieval output, and final answers.
- retrieval top-1/top-3/top-12 hit rates.
- scope leak count.
- background/runtime error count.

`recall_memory` usage is reported separately. A scenario can pass without a tool call when auto-injected `<memory>` was enough for the final answer.

Passing `--judge` adds an LLM-as-judge pass after deterministic scoring. The judge is semantic and can pass behavior that deterministic keyword checks mark as too literal, but deterministic checks remain in the report for comparison. The runner does not use eval-only retrieval tuning or prompt tuning.
