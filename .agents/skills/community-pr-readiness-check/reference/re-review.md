# Community PR Readiness Check — re-reviewing a PR you've already commented on

When looping over the GHC queue, skip PRs you reviewed before unless the contributor has actually done something. This avoids burning agent runs on PRs that are still waiting on the contributor.

## What does "the contributor did something" mean?

Any of:

- New commit pushed (`committed` event)
- Force-push / rebase (`head_ref_force_pushed`)
- Comment added (`commented`)
- Review submitted (`reviewed`)

Label changes, description edits by us, and skill-posted comments don't count.

## Use the GitHub Timeline API

The timeline endpoint returns every event on the PR with `actor.login` and a timestamp, so we can distinguish "contributor activity" from "skill activity" cleanly. This replaces an earlier heuristic that compared `committedDate` to the last skill comment — too narrow, since it missed contributor comments and force-pushes.

```bash
SKILL_USER=$(gh api user --jq .login)
gh api --paginate "repos/n8n-io/n8n/issues/<number>/timeline" \
  -H "Accept: application/vnd.github+json"
```

## Procedure

1. Resolve the skill user's login (`$SKILL_USER` above). This is the GitHub handle the skill is running as.
2. Fetch the full timeline.
3. Find the **last skill-authored event** — any event where `actor.login == $SKILL_USER` (labels applied, comments posted, etc.). Take its timestamp as `lastSkillAt`. If no skill activity exists → first-time review, run the full check.
4. Scan for **contributor activity after `lastSkillAt`** — events where:
   - `event` is one of `committed`, `head_ref_force_pushed`, `commented`, `reviewed`,
   - AND, for `commented` / `reviewed` / `head_ref_force_pushed`, `actor.login != $SKILL_USER` (skill comments shouldn't trigger re-review of themselves),
   - AND the event timestamp > `lastSkillAt`.

   Timestamp field varies by event type:

   | Event                     | Timestamp field          |
   |---------------------------|--------------------------|
   | `committed`               | `committer.date`         |
   | `head_ref_force_pushed`   | `created_at`             |
   | `commented`               | `created_at`             |
   | `reviewed`                | `submitted_at`           |

5. Decide:
   - One or more qualifying events → run the full review (steps 2–7 in SKILL.md).
   - None → skip the PR. Report "no contributor activity since previous review" and move on.

For `committed` events, there's no `actor.login` — the actor is the commit author email. Since the skill never pushes commits, treat every `committed` event as contributor activity unconditionally.

## Edge case: description-only edits

Body edits don't generate timeline events, so a contributor who only updates the PR description (e.g. fills in a missing template section) won't be picked up. That's a GitHub API limitation; the skill can't see body edits without diffing against a cached snapshot.

If the user explicitly mentions a PR they edited, just re-review it — that's faster than working around the API.
