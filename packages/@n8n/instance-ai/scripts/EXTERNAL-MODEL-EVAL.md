# Running the Instance AI model eval (external)

This runs n8n’s Instance AI workflow eval suite against an OpenAI-compatible
model endpoint (no API key on the model side). Cases are **shipped on disk** —
you do **not** need LangTracer.

**What is under test:** your model endpoint (builder).  
**What Anthropic is for:** grading only — mock helpers and the LLM verifier on
the eval CLI. It is not the model being scored.

---

## Prerequisites

| Tool | Notes |
|------|--------|
| Docker | n8n lane containers + local sandbox |
| Node.js 22+ and pnpm | Same as the n8n monorepo |
| This n8n checkout | Includes the script + offline suites |
| Anthropic API key | For verifier / mocks only |

Build the local n8n image once (includes the E2E reset endpoint):

```bash
INCLUDE_TEST_CONTROLLER=true pnpm build:docker
```

That produces `n8nio/n8n:local`. Rebuild only when the branch changes.

---

## Offline suites (no LangTracer)

Cases live under:

| Suite | Path | Cases |
|-------|------|------:|
| `model-comparison` | `packages/@n8n/instance-ai/evaluations/data/suites/model-comparison/` | 31 |
| `model-comparison-large` | `packages/@n8n/instance-ai/evaluations/data/suites/model-comparison-large/` | 61 |

Start with `model-comparison`. Use `model-comparison-large` for a wider pass.

---

## Minimal environment variables

Create a file at the **repo root** named `.env.local`:

```bash
# Required — grading stack only (NOT sent to your model endpoint)
ANTHROPIC_API_KEY=sk-ant-...

# Optional — publish results to LangSmith (omit → local JSON/HTML only)
# LANGSMITH_API_KEY=lsv2_...
# LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
```

That is the full required set for the keyless OpenAI-compatible router path.

**You do not need** a model API key for the dedicated router endpoint. The
script leaves the lane builder key empty when using `custom/*`.

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `ANTHROPIC_API_KEY` | **Yes** | Eval CLI verifier + helpers |
| `LANGSMITH_API_KEY` | No | Upload experiment traces/scores |
| `LANGSMITH_ENDPOINT` | No | e.g. `https://eu.api.smith.langchain.com` |

No `LANGTRACER_*` variables.

---

## Run against the Kimi / dedicated router endpoint

From the **repo root**:

```bash
pnpm --filter @n8n/instance-ai eval:experiment -- \
  --model custom/Kimi-K3 \
  --model-url 'https://YOUR-HOST/v1' \
  --suite model-comparison \
  --experiment-name model-comparison-kimi-k3-external \
  --sandbox-provider n8n-sandbox \
  --lanes 2 \
  --concurrency 4 \
  --iterations 3
```

Replace `https://YOUR-HOST/v1` with the OpenAI-compatible base URL
(must end in `/v1`).

For the larger suite:

```bash
pnpm --filter @n8n/instance-ai eval:experiment -- \
  --model custom/Kimi-K3 \
  --model-url 'https://YOUR-HOST/v1' \
  --suite model-comparison-large \
  --lanes 2 --concurrency 4 --iterations 1
```

### Recommended knobs for a dedicated router

Start small. High concurrency against a single router tends to surface
capacity errors (`no_available_workers`) and is not a fair model score.

| Flag | Suggested start | Notes |
|------|-----------------|-------|
| `--lanes` | `2` | Parallel n8n containers |
| `--concurrency` | `4` | Concurrent scenarios |
| `--iterations` | `1` then `3` | Smoke first, then full |

### Useful extras

```bash
  --keep-containers          # leave lanes up to inspect workflows
  --skip-eval                # boot + seed only
  --filter order-threshold-notify   # one case while debugging
```

Full flag list: `./packages/@n8n/instance-ai/scripts/run-eval-experiment.sh --help`

---

## What success looks like

1. Each lane prints `sandbox ok` and `model=Kimi-K3 ok`
2. Log line: `offline suite: model-comparison (31 cases) → …/data/suites/…`
3. Artifacts under `packages/@n8n/instance-ai/`:
   - `eval-results.json`
   - `.data/workflow-eval-report.html`
4. If `LANGSMITH_API_KEY` is set: an experiment URL in the logs

---

## Troubleshooting (short)

| Symptom | Likely cause |
|---------|----------------|
| `Suite directory not found` | Typo in `--suite` (use `model-comparison` or `model-comparison-large`) |
| `custom/* requires --model-url` | Forgot `--model-url` ending in `/v1` |
| `No available workers` / circuits open | Router capacity — lower `--lanes` / `--concurrency` |
| `missing API key for eval model 'custom/…'` on mocks | Known harness limitation for keyless `custom/*` on **lane-side** mock generation; share the report with n8n |
| Port already in use | Stop local n8n, or pass `--start-port 6678` |

---

## Security notes

- Put secrets only in `.env.local` (or your shell env). Do **not** pass API keys on the command line.
- `.env.local` should not be committed.
- Your model endpoint is called from the docker lanes; Anthropic is called from the eval CLI process for grading.
