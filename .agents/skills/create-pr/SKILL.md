---
name: n8n:create-pr
description: Creates GitHub pull requests with properly formatted titles that pass the check-pr-title CI validation. Use when creating PRs, submitting changes for review, or when the user says /pr or asks to create a pull request.
allowed-tools: Bash(git:*), Bash(gh:*), Read, Grep, Glob
---

# Create Pull Request

Creates GitHub PRs with titles that pass n8n's `check-pr-title` CI validation
and short descriptions that tell the reviewer what the diff does not show.

## PR Title Format

```
<type>(<scope>): <summary>
```

### Types (required)

| Type       | Description                                      | Changelog |
|------------|--------------------------------------------------|-----------|
| `feat`     | New feature                                      | Yes       |
| `fix`      | Bug fix                                          | Yes       |
| `perf`     | Performance improvement                          | Yes       |
| `test`     | Adding/correcting tests                          | No        |
| `docs`     | Documentation only                               | No        |
| `refactor` | Code change (no bug fix or feature)              | No        |
| `build`    | Build system or dependencies                     | No        |
| `ci`       | CI configuration                                 | No        |
| `chore`    | Routine tasks, maintenance                       | No        |

### Scopes (optional but recommended)

- `API` - Public API changes
- `ai-builder` - AI Workflow Builder and Instance AI
- `benchmark` - Benchmark CLI changes
- `core` - Core/backend/private API
- `editor` - Editor UI changes
- `engine` - New workflow execution engine v2 (@n8n/engine package & engine-v2 module in cli)
- `* Node` - Specific node (e.g., `Slack Node`, `GitHub Node`)

`check-pr-title` accepts only these scopes. Do not use a package or folder
name as the scope (for example `instance-ai`, `cli`, `evals` or `docker`).
If no scope fits, omit the scope. To give two scopes, separate them with a
comma and a space: `fix(core, editor): ...`.

### Title Summary Rules

- Use imperative present tense: "Add" not "Added"
- Capitalize first letter
- No period at the end
- No ticket IDs (e.g., N8N-1234) and no PR numbers (e.g., #12345)
- Add `(no-changelog)` as the last part to exclude the PR from the changelog,
  unless the type already excludes it
- Put the exclamation mark for a breaking change before the colon

## Steps

1. **Check current state**:
   ```bash
   git status
   git diff --stat
   git log origin/master..HEAD --oneline
   ```

2. **Check for implementation plan**: Look for a plan file in the repository plan directories (`.claude/plans/` or `.agents/plans/` when present)
   that matches the current branch's ticket ID (e.g. if branch is
   `scdekov/PAY-1234-some-feature`, check for `PAY-1234.md`).
   If a plan file exists, ask the user whether they want to include it in the
   PR description as a collapsible `<details>` section (see Plan Section below).
   Only include the plan if the user explicitly approves.

3. **If this is a security fix**, audit every public-facing artifact before
   proceeding (see Security Fixes below).

4. **Analyze changes** to determine:
   - Type: What kind of change is this?
   - Scope: Which scope from the Scopes list fits? Omit the scope if none fits.
   - Title summary: What does the change do?
   - Insights: What did the session (debugging, measurements, user
     discussion) find that a reviewer would otherwise miss?

5. **Identify feature flag test settings**: Inspect the full PR diff for new
   PostHog flags. Record the keys and values needed to test the new behavior
   as described in Feature Flag Test Settings below.

6. **Push branch if needed**:
   ```bash
   git push -u origin HEAD
   ```

7. **Create PR** using gh CLI. Read `.github/pull_request_template.md` as the
   body structure, then populate each section with actual content before
   creating the PR:
   - **Summary**: what the PR does and why, plus any surprises (see PR Body Guidelines below)
   - **How to test**: the steps that a person follows in the product to see the change work, and the command that runs the tests
   - **Related tickets**: add the Linear ticket URL (`https://linear.app/n8n/issue/[TICKET-ID]`), any GitHub issue links, and the docs link

   Before you create the PR, proofread the Summary against the Summary
   Section rules. Delete each sentence that restates the diff, or that is
   neither part of the first two sentences nor a surprise. Make sure that
   each sentence is true for the diff.

   When a later commit changes a fact in the body, update the body.

   ```bash
   gh pr create --draft --title "<type>(<scope>): <summary>" --body "$(cat <<'EOF'
   <populated body based on pull_request_template.md>
   EOF
   )"
   ```

## Feature Flag Test Settings

1. Compare the branch with `origin/master` using `git diff origin/master...HEAD`.
   If the PR targets another branch, use `origin/<target-branch>` instead.
   Inspect new experiment definitions in
   `packages/frontend/editor-ui/src/app/constants/experiments.ts`, shared
   flag constants in `packages/@n8n/api-types`, and new PostHog checks elsewhere
   in the diff. Resolve constants to the exact PostHog key string.
   Exclude removed flags, existing flags that the PR only references, and
   flag names that appear only in tests or documentation.
2. Select a test value for each new flag. Use `true` to enable a boolean flag.
   Read the flag's consumers and variant definitions for an A/B experiment.
   Use the exact variant that shows the new behavior.
   Do not assume that boolean `true` selects a named variant.
   If the required variant is unclear, report it instead of guessing.
   Preserve any value that the user explicitly requested for the same key.
3. If step 1 found at least one new flag, include `N8N_FEATURE_FLAG_OVERRIDES`
   in **How to test**. This environment variable accepts a JSON object that maps
   PostHog keys to boolean values or named variants. Tell the tester to set it
   before starting the test instance.
   For example:
   ```bash
   export N8N_FEATURE_FLAG_OVERRIDES='{"136_skill_sync":true}'
   ```
   Use JSON `false` to disable a boolean flag, or a string for a named variant.
   Combine multiple overrides in one JSON object.

The Codespace preview runner does not read `flag:` labels. Do not create or
apply them. For supported preview settings, see the Preview toggles and Preview
environment from a webhook sections in `.github/WORKFLOWS.md`.

## PR Body Guidelines

Based on `.github/pull_request_template.md`.

Keep the description short. The reviewer reads the diff for the details. The
description gives only what the diff cannot show: why the change exists, and
what could surprise the reviewer. Keep the length in proportion to the
complexity of the change: a complex change usually has more surprises. A
change with no surprises needs one or two sentences and nothing more.

Write for an engineer. Use exact technical terms, and do not simplify them.
Use ASD-STE100 Simplified Technical English: short sentences, active voice,
plain technical verbs, no metaphors.

### Summary Section
1. Start with one or two sentences: what the PR does and why. Write the first
   sentence in the imperative mood, like the PR title ("Fix the ...", "Add
   ...", "Change the ..."). Do not start with "This PR". State the area
   of the product or code (for example, the RabbitMQ Trigger node, workflow
   history, or the CI pipeline) and the nature of the change: a bug fix, a
   feature, a refactor, or tests. Do not name functions or fields in these
   sentences. The diff shows them.
2. Add more only when the change has one of these surprises. For each surprise
   that applies, add one short paragraph:
   - **Unexpected behaviour:** a change in behaviour for users or for other
     code paths, a changed default, a migration, or a side effect outside the
     obvious scope.
   - **Technical challenge:** a root cause that is not obvious, a constraint
     that forced the design, a workaround, or a known gap or follow-up.
   - **Rejected alternative:** only when a reviewer would suggest it. Give one
     sentence with the concrete reason it fails.
   - **Insight from the work:** a surprising fact that you found while you
     made the change and that the diff and the ticket do not show. For
     example, a measurement, a reproduction detail, a cause found while
     debugging, or an error in the ticket.
3. Leave out what the diff shows: file lists, renamed fields, call order, test
   names, error cases, and descriptions of the code. Leave out framework
   behaviour that reviewers know.
4. Do not add background, an introduction that repeats the title, or a
   closing sentence.
5. Define an n8n-internal term only if an engineer from another team would not
   know it. Use one short clause.
6. Include screenshots or videos for UI changes.

Examples of a complete Summary for a change with no surprises:

> Fix a bug in the RabbitMQ Trigger node. The node returned its channel before
> the queue bindings were complete, so it could miss the first messages.

> Fix the documentation in `AGENTS.md`. It referred to the UI design skill by
> an old name, so agents could not find the skill.

### How to test Section
- Write short steps for a person who tests the product change by hand: the
  setup, the action in the n8n UI or API, and the expected result
- Add an example workflow only if the test needs one
- If the change needs a non-default module (`N8N_ENABLED_MODULES`), an
  enterprise license, a feature flag, or similar, give the setting
- If the change has no behaviour that a person can see (refactor, CI, docs),
  write one line that says so
- Give the command that runs the tests for the change, for example
  `pnpm agent:test --filter <package> -- <test-file>`. If there are no tests,
  give the reason in one line. A bug fix needs a regression test. A feature
  needs tests

### Related Links Section
- Link to Linear ticket: `https://linear.app/n8n/issue/[TICKET-ID]`
- Link to GitHub issues using keywords to auto-close:
  - `closes #123` / `fixes #123` / `resolves #123`
- Link to Community forum posts if applicable
- Link the n8n-docs PR or the docs follow-up ticket, or write
  "Docs: none needed"

### Backport labels
Backport bugs with urgent or high priority and regression fixes. Add the
labels that `.github/backport_conventions.md` gives.

## Title Examples

### Feature in editor
```
feat(editor): Add workflow performance metrics display
```

### Bug fix in core
```
fix(core): Resolve memory leak in execution engine
```

### Node-specific change
```
fix(Slack Node): Handle rate limiting in message send
```

### Breaking change (add exclamation mark before colon)
```
feat(API)!: Remove deprecated v1 endpoints
```

### No changelog entry
```
feat(core): Experimental feature not enabled yet (no-changelog)
```

### No scope (affects multiple areas)
```
chore: Update dependencies to latest versions
```

## Validation

The PR title must match this pattern:
```
^(feat|fix|perf|test|docs|refactor|build|ci|chore|revert)(\((API|core|editor|benchmark|ai-builder|engine|[A-Za-z0-9 .]+ Node)(, (API|core|editor|benchmark|ai-builder|engine|[A-Za-z0-9 .]+ Node))*\))?!?: [A-Z].+[^.]$
```

Check the title against this pattern and the Title Summary Rules before you
run `gh pr create`. The two most frequent failures are a package name as the
scope and a lowercase first letter in the summary.

## Plan Section

If a matching plan file was found in a repository plan directory and the user has approved
including it, add a collapsible section at the end of the PR body (after the
Related Links section, before `EOF`):

```markdown
<details>
<summary>Implementation plan</summary>

<!-- paste plan file contents here -->

</details>
```

## Security Fixes

**This repo is public.** Never expose the attack vector in any public artifact.
Describe **what the code does**, not what threat it prevents.

| Artifact | BAD | GOOD |
|---|---|---|
| Branch | `fix-sql-injection-in-webhook` | `fix-webhook-input-validation` |
| PR title | `fix(core): Prevent SSRF` | `fix(core): Validate outgoing URLs` |
| Commit msg | `fix: prevent denial of service` | `fix: add payload size validation` |
| PR body | *"attacker could trigger SSRF…"* | *"validates URL protocol and host"* |
| Linear ref | URL with slug (leaks title) | URL without slug or ticket ID only |
| Test name | `'should prevent SQL injection'` | `'should sanitize query parameters'` |


**Before pushing a security fix, verify:** no branch name, commit, PR title,
PR body, Linear URL, test name, or code comment hints at the vulnerability.

**When in doubt, check the Linear issue for possible extra precautions**
