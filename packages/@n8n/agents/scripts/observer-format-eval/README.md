# Observer format eval

This harness measures how often the observational-memory Observer writes a
response that the parser rejects. A rejected response stores nothing and keeps
the cursor in place, so the next Observer call sends the same transcript delta
again. See [AST-1723](https://linear.app/n8n/issue/AST-1723).

The harness uses the real Observer prompt, the real model call, and the real
`runObservationLogObserver` with an in-memory store. Only the transcripts are
synthetic.

## Setup

- Put `N8N_AI_ANTHROPIC_KEY` in `.env.eval` at the repository root. `ev.sh`
  loads it with `dotenvx`.
- Run every command from this directory through `ev.sh`.
- `data/`, `out/`, and logs are git-ignored. Do not commit them.

## Commands

| Command | What it does |
| --- | --- |
| `./ev.sh gen.ts` | Generates 8 synthetic sessions in 3 parts each into `data/`. Skips parts that exist. Costs about $4. |
| `./ev.sh run.ts collect <variant> <model> <reps>` | Calls the Observer with `prompts/<variant>.txt` on `opus` or `sonnet` for each scenario at 3 sizes (part 1, parts 1-2, parts 1-3). Appends to `out/outputs.jsonl`, keyed so reruns skip done calls. |
| `./ev.sh run.ts score` | Sends each stored output through `runObservationLogObserver` with the parser in `src/`. Prints the accepted share and the share of output words kept in stored entries. Makes no model calls. |
| `./ev.sh run.ts loop <variant> <model> [s1,s2]` | Feeds each scenario's parts as successive batches through the real Observer loop. Prints input tokens per batch and whether the cursor advanced. |
| `./ev.sh malformed.ts` | Runs hand-written malformed outputs through the Observer. Wrong structures must print `reject`. |
| `./ev.sh which.ts` | Lists stored outputs that the parser still rejects, with the rejected lines. |
| `./ev.sh show.ts '<key>'` | Prints one stored output and the entries the parser keeps from it. |

## Compare parser versions

`score` and `loop` use the parser in `src/`. To get a baseline, stash or check
out the old `observation-log-observer.ts`, run the command, and then restore
the file. `score` reuses the stored outputs, so both parser versions see the
same model responses.

## Prompts

- `prompts/before.txt` is the Observer prompt before AST-1723.
- `prompts/after.txt` is the prompt after AST-1723. It must match
  `DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT`.

## Results for AST-1723

These results come from 8 scenarios (2 scenarios have only 2 parts), measured
on 2026-10-14.

Single Observer calls, share of responses stored:

| Prompt | Model | Parser before | Parser after |
| --- | --- | --- | --- |
| before | Opus 5.5 | 23% | 100% |
| before | Sonnet 5.5 | 35% | 100% |
| after | Opus 5.5 | 95% | 100% |
| after | Sonnet 5.5 | 52% | 99% |

Successive batches through the Observer loop:

| Code | Model | Batches with a stuck cursor | Total input tokens |
| --- | --- | --- | --- |
| before | Opus 5.5 | 12 of 22 | 499k |
| after | Opus 5.5 | 0 of 22 | 393k |
| before | Sonnet 5.5 | 14 of 22 | 593k |
| after | Sonnet 5.5 | 0 of 22 | 409k |
