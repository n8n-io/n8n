# PR Monitor — Reference

Detailed classification rules. The main workflow lives in [SKILL.md](SKILL.md).

## CI classification

### Trivial → auto-fix

| Failure | Signal in log | Fix |
|---|---|---|
| Lint (ESLint/Biome) | Job name contains `lint` / `biome` / `eslint`; rule names like `no-unused-vars`, `prefer-const` | Auto-fix script in the affected package (`pnpm lintfix` if it exists, else `pnpm lint -- --fix`) |
| Format | `biome check`, "would be formatted", "Code style issues" | `pnpm format` (or `pnpm biome format --write`) in affected package |
| Typecheck: missing import | `Cannot find name 'X'` and `X` is exported from a known module in the workspace | Add the appropriate `import { X } from '…'` |
| Typecheck: null narrowing | `'X' is possibly 'undefined'` or `'null'` on a clearly safe access path | Add `?.` or `!` (use `!` only if it is already idiomatic in the same file) |
| Typecheck: missing return type | `Missing return type on function` (when enforced) | Annotate the inferred return type |

After every auto-fix: `pnpm typecheck` in the affected package. If new errors appear or the original isn't resolved → revert the change inside the worktree (`git restore .`) and re-classify the finding as non-trivial.

Hard stops — escalate to non-trivial regardless of the above:
- Auto-fix would touch more than 30 files (likely overly broad)
- Fix would require changing a function signature, adding generics, or modifying an exported type in `@n8n/api-types`
- Fix would introduce `any` or remove an existing type annotation
- Fix would require editing files outside the diff of this PR

### Flaky → auto-rerun (max 2 per PR)

Apply only to e2e jobs. Identify by job name matching `n8n-playwright`, `playwright-*`, `e2e-*`.

Flaky signals in the failed step log (any one is enough):
- `Test timeout of \d+ms exceeded`
- `expect(received).toBeVisible() failed` followed by retry/timeout context
- `net::ERR_`, `ECONNRESET`, `socket hang up`, `ECONNREFUSED`
- `BrowserContext disposed`, `Target closed`, `Page closed`
- `failed to launch browser`, `chrome exited`
- Container/service startup errors (`waiting for healthy`, `unable to connect to postgres`)

Cross-check by looking for a green run of the same SHA:

```bash
gh run list --branch <branch> --json databaseId,headSha,status,conclusion --limit 20 \
  | jq '[.[] | select(.headSha == "'"$HEAD_SHA"'")]'
```

Rerun command:

```bash
gh run rerun <databaseId> --failed
```

Increment `flakyRestartCount`. If it would exceed 2 → do not rerun; escalate as non-trivial with the message "Already retried twice, likely a real failure".

### Non-trivial → ask user

Everything not covered above. Concrete examples:
- Unit / integration test failures (`*.test.ts`, `*.spec.ts` not under `playwright/`)
- Build errors that aren't typecheck (rollup, vite, esbuild)
- Security scans (CodeQL, npm audit, licence checks)
- Structural type errors that require signature or interface changes
- Lint errors where `--fix` does not resolve cleanly
- Jobs named `release/*`, `audit/*`, `licence-*`

When asking, include:
- Job name + failing step
- ~20 lines of log around the error
- A proposed patch as a fenced ```diff``` block when you have one
- A single clear yes/no question

## cubic-dev classification

`cubic-dev-ai[bot]` leaves PR review comments. Each comment has an `id`, a `body`, a `path`, and a `line`.

### Trivial → auto-fix

- Typos in identifiers, string literals, or comments (any human-language fix)
- Unused imports / unused local variables flagged by name
- Missing `await` on an async call whose return value is discarded
- Variable rename suggestions when the new name is used only in the flagged file
- Dead code removal (unreachable branches, redundant assignments)
- JSDoc spelling / grammar
- Removing `console.log` left in by accident

### Non-trivial → ask user

- Anything tagged P1 or P2 in the comment body
- Logic changes ("should also check X", "missing edge case", "off-by-one")
- Refactor suggestions ("extract into a helper", "use map instead of forEach")
- Security or performance concerns
- API / interface surface changes
- Anything that spans more than one file
- Anything you cannot fully diagnose from the comment plus the surrounding 20 lines of the file

### After applying a trivial fix

- Run `pnpm lint && pnpm typecheck` in the affected package. If either fails, revert and escalate.
- Commit with a body line linking the cubic-dev comment's `html_url`.
- Add the comment `id` to `processedCommentIds` so we don't re-process it next cycle.
- Do **not** post a reply on GitHub. Do **not** auto-resolve the thread — leave that to the human review.

## Merge queue

### Detecting eviction

Each cycle, query the current merge queue entry. Compare against `knownMergeQueueEntries`:

- If the PR is currently in the queue → append `{enteredAt, position}` if not already tracked.
- If the PR was in the queue last cycle but is no longer → eviction. Investigate.

Find the merge-group run that failed:

```bash
gh api repos/n8n-io/n8n/actions/runs \
  --jq '.workflow_runs[]
        | select(.event == "merge_group")
        | select(any(.pull_requests[]?; .number == '"$PR"'))
        | {id, head_sha, conclusion, head_branch}' \
  | head -5
```

### Re-queue automatically when

All of:
1. The eviction was caused by a failed check on the **merge-group commit**, not the PR's HEAD SHA
2. The failed step references files **not** in this PR's diff:
   ```bash
   gh pr diff "$PR" --name-only
   ```
3. `mergeQueueReQueueCount < 3` (cap to avoid loops)

### Ask user when

- The failed check was on the PR's HEAD SHA directly (this PR is the cause)
- The failed step touches files this PR changed
- `mergeQueueReQueueCount >= 3`

### Determining the default merge method

Cache once in the state file's `defaultMergeMethod`. Query with:

```bash
gh api repos/n8n-io/n8n --jq '{
  squash:.allow_squash_merge,
  merge:.allow_merge_commit,
  rebase:.allow_rebase_merge
}'
```

For `n8n-io/n8n` this is typically `squash`. Verify on first cycle and persist.

### Re-queue command

```bash
gh pr merge "$PR" --auto --squash    # or --merge / --rebase per defaultMergeMethod
```

Append a fresh entry to `knownMergeQueueEntries` after success. Increment `mergeQueueReQueueCount`.
