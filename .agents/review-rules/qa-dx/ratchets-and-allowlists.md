# Ratchets and allowlists

Applies to: baseline files, `packages/cli/eslint.config.mjs`, lint configs.

Several checks are ratchets: they permit what already exists and fail only on
growth. That design has one blind spot — adding the new violation to the
baseline is indistinguishable, to the tool, from fixing it. Only review catches
it.

Flag a diff that **adds** entries to any of these, and ask for the fix instead:

| File | Ratchet |
|------|---------|
| `.code-health-baseline.json` | `@n8n/code-health` violations |
| `.boundaries-baseline.json` | `turbo boundaries` issue count |
| `packages/testing/playwright/.janitor-baseline.json` | Playwright janitor findings |
| `packages/cli/eslint.config.mjs` | the `misplaced-n8n-typeorm-import` and public-API allowlists, each captioned "NEVER add to this list" |

Removals are the healthy direction and need no comment.

Two specifics:

- `.boundaries-baseline.json` holds a single integer, not a fingerprinted list.
  A fixed issue and a new one at the same count cancel out and the ratchet stays
  green. Treat any change to that number as worth explaining.
- Regenerating a baseline wholesale, rather than appending to it, hides growth
  inside a large diff. If a PR rewrites a baseline, ask what the net change to
  the violation count is.

## Downgrading a rule is the same move

Flag a lint rule moved from `'error'` to `'warn'` or `'off'`, and a new
`eslint-disable` for one of the guarded rules. Most packages run
`eslint . --quiet`, so a warning never fails CI — downgrading to `'warn'` is
functionally deleting the rule while appearing to keep it.
