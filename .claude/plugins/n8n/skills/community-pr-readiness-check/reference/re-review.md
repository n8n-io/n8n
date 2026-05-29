# Community PR Readiness Check — re-reviewing a PR you've already commented on

When looping over the GHC queue, skip PRs you reviewed before unless the contributor has actually done something. This avoids burning agent runs on PRs that are still waiting on the contributor.

## What does "the contributor did something" mean?

For our purposes, it means **a new commit has landed on the PR's head branch**. Description edits, title fixes, and label changes on their own are usually noise — what matters is whether the code has moved.

## The right comparator: `committedDate`, not `updatedAt`

The intuitive choice is `gh pr view --json updatedAt`. **Don't use it.** `updatedAt` moves whenever *anything* on the PR changes, including labels applied by this very skill on its previous pass. A loop that runs the label step once will poison every PR's `updatedAt` for the next run.

The reliable comparator is the head commit timestamp:

```bash
gh pr view <number> --repo n8n-io/n8n --json commits --jq '.commits[-1].committedDate'
```

This only moves when the contributor pushes new commits.

## Procedure

1. Get the head commit timestamp from `committedDate` (command above).
2. Get the timestamp of your most recent skill-generated comment on the PR:
   ```bash
   gh api --paginate "repos/n8n-io/n8n/issues/<number>/comments" \
     --jq '[.[] | select(.user.login == "<your-gh-handle>") | .created_at] | max'
   ```
3. Compare:
   - `committedDate <= lastCommentAt` → no new commits since the last review. Skip the full re-check and report "no change since previous review".
   - `committedDate > lastCommentAt` → the contributor has pushed. Re-run the full review (steps 2–7 in SKILL.md).

## Edge case: description-only contributor edits

If a contributor edits the PR description to add the missing template sections but doesn't push a new commit, `committedDate` won't move and this heuristic will skip them. That's a known trade-off — `updatedAt` is too noisy and there's no clean middle ground via the GitHub API.

If you suspect this case (e.g. user mentions a specific PR), fetch the PR body manually and re-review even if `committedDate` is stale.
