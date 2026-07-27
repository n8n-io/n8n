# QQ resolution reference

## Release containment

Check whether a fix commit is included in a release tag:

```sh
git merge-base --is-ancestor <fix-commit> <release-tag>
```

- Exit `0`: the release contains the fix.
- Exit `1`: the release does not contain the fix.

List local release tags containing the fix:

```sh
git tag --contains <fix-commit> | rg '^n8n@'
```

Refresh tags or query GitHub before concluding that no current release contains
the fix. Compare both the ticket's affected release and the latest stable/beta.

## Historical regression check

For a candidate fix commit `<fix-commit>`:

1. Run the focused test on current master and record the result.
2. Create an isolated temporary worktree at `<fix-commit>^`.
3. Apply only the focused test to that worktree.
4. Run the single test by name.
5. Confirm that the failure matches the hypothesis, not a setup problem.
6. Remove the temporary worktree.

Do not modify the user's main checkout to simulate old behavior. Reuse installed
dependencies only when the historical code is compatible; otherwise report the
environment limitation.

## Similar-issue and ownership check

Search Linear across the workspace, not only the current team. Use several
independent keys:

- exact exception class or provider/status code;
- top n8n-owned stack frame or source symbol;
- node/component plus operation (`insert`, `retrieve`, `supplyData`, etc.);
- concise user-visible symptom;
- linked Sentry group, GitHub issue, or candidate fix PR.

Include completed and canceled issues so an earlier fix is not missed. A match
is a duplicate only when the same underlying boundary and remedy apply. Record
nearby issues that look similar but require a different fix.

Use this ownership evidence in descending order:

1. Component/service ownership documentation and `.github/CODEOWNERS`.
2. The n8n-owned frame where behavior must change.
3. Team ownership of an existing canonical issue or merged fix for that path.
4. Recent maintainers and reviewers from `git log -- <path>` and linked PRs.
5. Labels, current assignment, and Flaky suggestions as supporting signals only.

For shared code, identify whether the change belongs at the shared boundary or
inside one integration. State conflicting signals explicitly and ask both teams
to confirm rather than guessing.

## Resolution report

```markdown
**Ticket:** <ID>
**Verdict:** <reproducible | already fixed | duplicate | blocked | reroute>
**Confidence:** <high | medium | low>

### Evidence
- Observed: ...
- Verified in source/test: ...
- Missing or inferred: ...

### Triage recommendation
- Similar issues / canonical ticket: ...
- Proposed owner and evidence: ...
- Priority / estimate: ...
- SLA action: ...
- Linear state: ...

### Next action
<one concrete action and its success condition>

### Validation
<tests, release containment, linked fix, or reproduction attempts>

**Mutations:** <read-only | exact comments/state/code/PR changes>
```

## Missing-information comment

```markdown
Thanks for the report. To verify this, could you provide:

- the n8n version where it currently reproduces;
- a minimal redacted workflow or exact reproduction steps;
- the complete error details, including the failing node;
- the provider status/body or request ID, if available.

We recommend blocking pickup and pausing the SLA until this evidence is
available. We can return it to Triage once a current-version failure is clear.
```

## Ownership comment

```markdown
The failure boundary appears to be in <component>, owned by @<team>, rather than
the AI implementation itself. Could @<team> confirm ownership? Evidence:
<one stack/source fact>. Recommended next step: <one concrete action>.
```

## Already-fixed comment

```markdown
This is covered by <canonical ticket / PR>, which handles the same <operation>
failure at <shared boundary>. The fix is merged but is not present in <affected
release/current release>. Recommend relating this ticket, moving it to `To be
released`, and verifying that <event/error> stops on the first containing
release. Reopen if it recurs on that release.
```
