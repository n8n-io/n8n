---
name: create-pr
description: Creates GitHub pull requests with properly formatted titles that pass the check-pr-title CI validation. Use when creating PRs, submitting changes for review, or when the user says /pr or asks to create a pull request.
allowed-tools: Bash(git:*), Bash(gh:*), Read, Grep, Glob
---

# Create Pull Request

Creates GitHub PRs with titles that pass n8n's `check-pr-title` CI validation.

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
- `benchmark` - Benchmark CLI changes
- `core` - Core/backend/private API
- `editor` - Editor UI changes
- `* Node` - Specific node (e.g., `Slack Node`, `GitHub Node`)

### Summary Rules

- Use imperative present tense: "Add" not "Added"
- Capitalize first letter
- No period at the end
- No ticket IDs (e.g., N8N-1234)
- Add `(no-changelog)` suffix to exclude from changelog

## Steps

1. **Check current state**:
   ```bash
   git status
   git diff --stat
   git log origin/master..HEAD --oneline
   ```

2. **Analyze changes** to determine:
   - Type: What kind of change is this?
   - Scope: Which package/area is affected?
   - Summary: What does the change do?

3. **Push branch if needed**:
   ```bash
   git push -u origin HEAD
   ```

4. **Create PR** using gh CLI with the template from `.github/pull_request_template.md`:
   ```bash
   gh pr create --draft --title "<type>(<scope>): <summary>" --body "$(cat <<'EOF'
   ## Summary

   <Describe what the PR does and how to test. Photos and videos are recommended.>

   ## Related Linear tickets, Github issues, and Community forum posts

   <!-- Link to Linear ticket: https://linear.app/n8n/issue/[TICKET-ID] -->
   <!-- Use "closes #<issue-number>", "fixes #<issue-number>", or "resolves #<issue-number>" to automatically close issues -->

   ## Review / Merge checklist

   - [ ] PR title and summary are descriptive. ([conventions](../blob/master/.github/pull_request_title_conventions.md))
   - [ ] [Docs updated](https://github.com/n8n-io/n8n-docs) or follow-up ticket created.
   - [ ] Tests included.
   - [ ] PR Labeled with `release/backport` (if the PR is an urgent fix that needs to be backported)
   EOF
   )"
   ```

## PR Body Guidelines

Based on `.github/pull_request_template.md`:

### Summary Section
- Describe what the PR does
- Explain how to test the changes
- Include screenshots/videos for UI changes

### Related Links Section
- Link to Linear ticket: `https://linear.app/n8n/issue/[TICKET-ID]`
- Link to GitHub issues using keywords to auto-close:
  - `closes #123` / `fixes #123` / `resolves #123`
- Link to Community forum posts if applicable

### Checklist
All items should be addressed before merging:
- PR title follows conventions
- Docs updated or follow-up ticket created
- Tests included (bugs need regression tests, features need coverage)
- `release/backport` label added if urgent fix needs backporting

## Examples

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
refactor(core): Simplify error handling (no-changelog)
```

### No scope (affects multiple areas)
```
chore: Update dependencies to latest versions
```

## Validation

The PR title must match this pattern:
```
^(feat|fix|perf|test|docs|refactor|build|ci|chore|revert)(\([a-zA-Z0-9 ]+( Node)?\))?!?: [A-Z].+[^.]$
```

Key validation rules:
- Type must be one of the allowed types
- Scope is optional but must be in parentheses if present
- Exclamation mark for breaking changes goes before the colon
- Summary must start with capital letter
- Summary must not end with a period
