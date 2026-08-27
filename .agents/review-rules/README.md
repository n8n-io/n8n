# Review rules

Rules the AI reviewer (cubic) enforces on pull requests. One rule per file,
grouped by the agent that loads it. `cubic.yaml` links these files via
`file_paths`; the prose in `cubic.yaml` stays thin so the rules are reviewable
as normal markdown.

## Layout

| Directory   | Agent    | Scope                                               |
|-------------|----------|-----------------------------------------------------|
| `security/` | Security | backend packages + nodes                            |
| `backend/`  | Backend  | `cli`, `@n8n/db`, `core`, `workflow`, node packages |
| `frontend/` | Frontend | `packages/frontend`                                 |
| `qa-dx/`    | QA & DX  | `.github`, `docker`, `scripts`, `patches`, `packages/testing`, the lint/test/TS config packages, baselines |

One slot of five is left. QA & DX covers the build, test, and CI surface — the
same paths `.github/OWNERS` assigns to `@n8n-io/qa-dx`. Code-quality rules that
happen to apply broadly (error classes, `any`, lazy imports) are backend rules,
not QA & DX ones.

## Limits that bite

cubic fails silently on all three of these, which is why `pnpm check:cubic-config`
enforces them in CI:

- **5 enabled agents per repository.** Rules past the fifth never run and cubic
  says nothing. One slot is deliberately left free.
- **10,000 characters per agent**, counting the `description` plus every linked
  file, concatenated in the listed order. Everything past the limit is dropped
  from the review prompt.
- **Repo-relative file paths only.** Globs, directories, parent-directory
  traversal, and absolute paths are all rejected — list each file explicitly.
  The schema caps `file_paths` at 10 entries per agent.

## Adding a rule

1. Write the file in the directory for the agent that should own it. Open with a
   one-line "Applies to:" so the reviewer skips it on unrelated files — a
   backend PR still loads the node rules, since include globs are per-agent.
2. Add its path to that agent's `file_paths` in `cubic.yaml`.
3. Run `pnpm check:cubic-config`. It validates `cubic.yaml` against cubic's
   published JSON schema, then fails on a missing path, an over-budget agent, or
   a rule file nobody links, and warns at 80% of the ceiling.

The schema is vendored at `.github/scripts/quality/cubic-config.schema.json` so
the check needs no network. `util-refresh-cubic-schema.yml` re-pulls it on the 1st
of each month and opens a PR when it changed — review that diff for new cubic
options worth adopting. To refresh by hand:
`node .github/scripts/quality/check-cubic-config.mjs --refresh`.

Don't restate something ESLint already errors on — see the "Don't repeat the
linter" section in `cubic.yaml`. Write what static analysis cannot see.

## Working with cubic on a PR

Tag `@cubic-dev-ai` in a PR comment (GitHub autocomplete won't offer it — type it).
Replying to one of cubic's own comments needs no tag, but a bare reply never
authorises code changes.

| Ask | Comment |
|-----|---------|
| Re-review everything | `@cubic-dev-ai review this PR` |
| Review only what changed since its last pass | `@cubic-dev-ai incremental review` |
| Deeper pass with the stronger models | `@cubic-dev-ai ultrareview` — or `ultrareview: focus on <topic>` |
| Fix a finding on this branch | `@cubic-dev-ai fix this issue in this branch` |
| One-off context for this run only | `@cubic-dev-ai review this and use <url>` |
| Ask about a finding | reply in the thread |

Two things worth knowing:

- Ultrareview is billed at 3× a normal review, which is why it is manual rather
  than automatic here.
- A PR over 10,000 changed lines, or carrying one of the ignored automation
  labels, gets no automatic review. `@cubic-dev-ai review this PR` overrides
  that when you want it.

Disagreeing in a thread is not wasted: cubic turns feedback into team-scoped
learnings, so a well-argued "this is fine because X" shapes later reviews. Vague
replies ("done", "thanks") don't.
