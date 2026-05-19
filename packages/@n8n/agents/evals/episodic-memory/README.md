# Episodic Memory Golden Eval

Package-local golden eval for source-backed Episodic Memory.

The eval runs natural multi-thread scenarios against the SDK runtime with in-memory storage. It lets observational memory create observations, lets episodic memory index and reflect entries, then asks explicit prior-context questions that should use `recall_memory`.

## Run

```bash
pushd packages/@n8n/agents
pnpm exec tsx evals/episodic-memory/run.ts --preset smoke --out /tmp/em-eval-smoke
EM_EVAL_JUDGE=1 EM_EVAL_JUDGE_MODEL=openai/gpt-5.5 pnpm exec tsx evals/episodic-memory/run.ts --preset golden --out /tmp/em-eval-golden
popd
```

Defaults:

- `--preset smoke`: first two scenarios
- `--preset golden`: all ten scenarios
- `EM_EVAL_MODEL`: agent model, default `openai/gpt-5.5`
- `EM_EVAL_JUDGE_MODEL`: judge model, default `EM_EVAL_MODEL` or `openai/gpt-5.5`
- `EM_EVAL_JUDGE=1`: enables optional judge scoring

## Outputs

The runner writes:

- `results.json`
- `entries.json`
- `sources.json`
- `recalls.json`
- `answers.json`
- `scorecard.json`
- `report.md`

Deterministic metrics are always computed. Judge scores are advisory and only present when `EM_EVAL_JUDGE` is enabled.
