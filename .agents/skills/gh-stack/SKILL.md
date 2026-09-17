---
description: |
    Manage stacked branches and pull requests with the gh-stack GitHub CLI extension. Use when the user wants to create, push, rebase, sync, navigate, or view stacks of dependent PRs. Triggers on tasks involving stacked diffs, dependent pull requests, branch chains, or incremental code review workflows.
metadata:
    author: github
    github-path: skills/gh-stack
    github-ref: refs/tags/v0.1.0
    github-repo: https://github.com/github/gh-stack
    github-tree-sha: c95c8b5b4dd850f3fef007b304428f5684f2fb87
    version: 0.0.9
name: n8n:gh-stack
---
# gh-stack

`gh stack` is a [GitHub CLI](https://cli.github.com/) extension for managing **stacked branches and pull requests**. A stack is an ordered list of branches where each branch builds on the one below it, rooted on a trunk branch (typically the repo's default branch). Each branch maps to one PR whose base is the branch below it, so reviewers see only the diff for that layer.

```
main (trunk)
 └── auth-layer     → PR #1 (base: main)            - bottom (closest to trunk)
  └── api-endpoints → PR #2 (base: auth-layer)
   └── frontend     → PR #3 (base: api-endpoints)   - top (furthest from trunk)
```

The **bottom** of the stack is the branch closest to the trunk, and the **top** is the branch furthest from the trunk. Each branch inherits from the one below it. Navigation commands (`up`, `down`, `top`, `bottom`) follow this model: `up` moves away from trunk, `down` moves toward it.

## When to use this skill

Use this skill when the user wants to:

- Break a large change into a chain of small, reviewable PRs
- Create, rebase, push, or sync a stack of dependent branches
- Navigate between layers of a branch stack
- View the status of stacked PRs
- Tear down and rebuild a stack to remove, reorder, or rename branches

## Prerequisites

The GitHub CLI (`gh`) v2.0+ must be installed and authenticated. Install the extension with:

```bash
gh extension install github/gh-stack
```

Before using `gh stack`, configure git to prevent interactive prompts:

```bash
git config rerere.enabled true           # remember conflict resolutions (skips prompt on init)
git config remote.pushDefault origin     # if multiple remotes exist (skips remote picker)
```

## Agent rules

**All `gh stack` commands must be run non-interactively.** Every command invocation must include the flags and positional arguments needed to avoid prompts, TUIs, and interactive menus. If a command would prompt for input, it will hang indefinitely.

1. **Always supply branch names as positional arguments** to `init`, `add`, and `checkout`. Running these commands without arguments triggers interactive prompts. Branch names are used exactly as given — a name is never prefixed or transformed, so `gh stack add refactor/foo` creates a branch named `refactor/foo`.
2. **Always use `--auto` with `gh stack submit`** to auto-generate PR titles. Without `--auto`, `submit` prompts for a title for each new PR.
3. **Always use `--json` with `gh stack view`.** Without `--json`, the command launches an interactive TUI that cannot be operated by agents. There is no other appropriate flag — always pass `--json`.
4. **Handle multiple remotes.** If more than one remote is configured, pre-configure `git config remote.pushDefault origin`, or pass `--remote <name>` to the commands that accept it: `push`, `submit`, `sync`, `rebase`, and `link`. `checkout`, `modify`, and `trunk` resolve a remote but have **no `--remote` flag** — they rely on `remote.pushDefault`. With multiple remotes and no configured default, these commands exit with an error in non-interactive mode.
5. **Avoid branches shared across multiple stacks.** If a branch belongs to multiple stacks, commands exit with code 6. Check out a non-shared branch first.
6. **Plan your stack layers by dependency order before writing code.** Foundational changes (models, APIs, shared utilities) go in lower branches; dependent changes (UI, consumers) go in higher branches. Think through the dependency chain before running `gh stack init`.
7. **Use standard `git add` and `git commit` for staging and committing.** This gives you full control over which changes go into each branch. The `-Am` shortcut is available but should not be the default approach—stacked PRs are most effective when each branch contains a deliberate, logical set of changes.
8. **Navigate down the stack when you need to change a lower layer.** If you're working on a frontend branch and realize you need API changes, don't hack around it at the current layer. Navigate to the appropriate branch (`gh stack down`, `gh stack checkout`, or `gh stack bottom`), make and commit the changes there, run `gh stack rebase --upstack`, then navigate back up to continue.
9. **Use `gh stack link` for external tool workflows.** When branches are managed by an external tool (jj, Sapling, etc.), use `gh stack link branch-a branch-b`. `link` does not rely on local tracking state and is intended for API-driven PR and stack management. Provide at least two branches/PRs to create or update a stack, or a stack number followed by the new branches/PRs to append them to the top of an existing stack (e.g. `gh stack link 7 branch-c`).
10. **Use `gh stack merge --yes` to merge stacked PRs.** `gh pr merge` does not work with stacked PRs. In a non-interactive terminal `gh stack merge` runs without prompting and merges the entire stack (bottom to top) atomically; pass `--yes` to be explicit. Scope the merge by passing a pull request number (`gh stack merge 42 --yes` merges everything up to and including PR #42) or a stack number (`gh stack merge 7 --yes`, which needs no local checkout). Choose the method with `--squash`, `--rebase`, `--merge`, or `--merge-method <method>`; without one, the last-used method is used. The merge is all-or-nothing — if any PR can't be merged, none are, and the failure reason is reported. Only basic pull request state is checked before merging (open and not a draft); bypassing merge requirements is not supported for stacks. If the base branch uses a merge queue, the stack is added to the queue instead of merging directly: the queue chooses the merge method (any method you pass is ignored with a warning), and the pull requests are added to the queue together but merge as the queue processes them, so they may land in separate groups rather than all at once.

**Never do any of the following — each triggers an interactive prompt or TUI that will hang:**
- ❌ `gh stack view` or `gh stack view --short` — always use `gh stack view --json`
- ❌ `gh stack submit` without `--auto` — always use `gh stack submit --auto`
- ❌ `gh stack init` without branch arguments — always provide branch names
- ❌ `gh stack add` without a branch name — always provide a branch name
- ❌ `gh stack checkout` without an argument — always provide a PR number or branch name
- ❌ `gh stack checkout <pr-number>` when a different local stack already exists on those branches — this triggers an unbypassable conflict resolution prompt; use `gh stack unstack --local` first to remove the local tracking state (this keeps the stack on GitHub intact), then retry the checkout

## Thinking about stack structure

Each branch in a stack should represent a **discrete, logical unit of work** that can be reviewed independently. The changes within a branch should be cohesive—they belong together and make sense as a single PR.

### Dependency chain

Stacked branches form a dependency chain: each branch builds on the one below it. This means **foundational changes must go in lower (earlier) branches**, and code that depends on them goes in higher (later) branches.

**Plan your layers before writing code.** For example, a full-stack feature might be structured like this (use branch names relevant to your actual task, not these generic ones):

```
main (trunk)
 └── data-models    ← shared types, database schema
  └── api-endpoints ← API routes that use the models
   └── frontend-ui  ← UI components that call the APIs
    └── integration ← tests that exercise the full stack
```

This is illustrative — choose branch names and layer boundaries that reflect the specific work you're doing. The key principle is: if code in one layer depends on code in another, the dependency must be in the same branch or a lower one.

### Branch naming

Choose a clear, descriptive branch name for each layer that reflects the concern it contains (e.g., `auth`, `api-routes`, `frontend`). Branch names are used exactly as you provide them to `init` and `add` — nothing is prepended or transformed. Slashes are allowed and are treated as part of the name (e.g., `gh stack add refactor/foo` creates a branch named `refactor/foo`).

### Staging changes deliberately

The main reason to use `git add` and `git commit` directly is to control **which changes go into which branch**. When you have multiple files in your working tree, you can stage a subset for the current branch, commit them, then create a new branch and stage the rest there:

```bash
# You're on data-models with several new files in your working tree.
# Stage only the model files for this branch:
git add internal/models/user.go internal/models/session.go
git commit -m "Add user and session models"

git add db/migrations/001_create_users.sql
git commit -m "Add user table migration"

# Now create a new branch for the API layer and stage the API files there:
gh stack add api-routes # created & switched to the api-routes branch
git add internal/api/routes.go internal/api/handlers.go
git commit -m "Add user API routes"
```

This keeps each branch focused on one concern. Multiple commits per branch are fine — the key is that all commits in a branch relate to the same logical concern, and changes that belong to a different concern go in a different branch.

### When to create a new branch

Create a new branch (`gh stack add`) when you're starting a **different concern** that depends on what you've built so far. Signs it's time for a new branch:

- You're switching from backend to frontend work
- You're moving from core logic to tests or documentation
- The next set of changes has a different reviewer audience
- The current branch's PR is already large enough to review

### One stack, one story

Think of a stack from the reviewer's perspective: the stack of PRs should **tell a cohesive story** about a feature or project. A reviewer should be able to read the PRs in sequence and understand the progression of changes, with each PR being a small, logical piece of the whole.

**When to use a single stack:** All the branches are part of the same feature, project, or closely related effort. Even if the work spans multiple concerns (models, API, frontend), they're all building toward the same goal.

**When to create a separate stack:** The work is unrelated to your current stack — a different feature, a bug fix in an unrelated area, or an independent refactor. Don't mix unrelated work into a single stack just because you happen to be working on both. Start a new stack with `gh stack init` or switch to an existing stack with `gh stack checkout` for each distinct effort.

Small, incidental fixes (e.g., fixing a typo you noticed) can go in the current stack if they're trivial. But if a change grows into its own project, it deserves its own stack.

## Quick reference

| Task | Command |
|------|---------|
| Create a stack | `gh stack init auth` |
| Create a stack of multiple branches | `gh stack init auth api frontend` |
| Adopt existing branches | `gh stack init existing-branch-a existing-branch-b` |
| Set custom trunk | `gh stack init --base develop branch-a` |
| Add a branch to stack | `gh stack add api-routes` |
| Add branch + stage all + commit | `gh stack add -Am "message" api-routes` |
| Push branches to remote | `gh stack push` |
| Push to specific remote | `gh stack push --remote origin` |
| Push branches + create draft PRs | `gh stack submit --auto` |
| Create PRs as ready for review | `gh stack submit --auto --open` |
| Sync (fetch, rebase, push) | `gh stack sync` |
| Sync with specific remote | `gh stack sync --remote origin` |
| Sync and prune merged branches | `gh stack sync --prune` |
| Rebase entire stack | `gh stack rebase` |
| Rebase upstack only | `gh stack rebase --upstack` |
| Rebase without trunk | `gh stack rebase --no-trunk` |
| Continue after conflict | `gh stack rebase --continue` |
| Abort rebase | `gh stack rebase --abort` |
| View stack details (JSON) | `gh stack view --json` |
| Switch branches up/down in stack | `gh stack up [n]` / `gh stack down [n]` |
| Switch to top/bottom branch | `gh stack top` / `gh stack bottom` |
| Check out by stack number | `gh stack checkout 7` |
| Check out by PR | `gh stack checkout 42` |
| Check out by branch (local only) | `gh stack checkout feature-auth` |
| Tear down the current stack to restructure it | `gh stack unstack` |
| Tear down a specific stack by number | `gh stack unstack 7` |
| Merge the whole current stack | `gh stack merge --yes` |
| Merge a stack by number | `gh stack merge 7 --yes` |
| Merge up to a specific PR | `gh stack merge 42 --yes` |
| Merge with a specific method | `gh stack merge --yes --squash` |

---

## Workflows

### End-to-end: create a stack from scratch

```bash
# 1. Initialize a stack with the first branch
gh stack init auth
# → creates auth and checks it out

# 2. Write code for the first layer (auth)
cat > auth.go << 'EOF'
package auth

func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // verify token
        next.ServeHTTP(w, r)
    })
}
EOF

# 3. Stage and commit using standard git commands
git add auth.go
git commit -m "Add auth middleware"

# You can make multiple commits on the same branch
cat > auth_test.go << 'EOF'
package auth

func TestMiddleware(t *testing.T) {
    // test auth middleware
}
EOF
git add auth_test.go
git commit -m "Add auth middleware tests"

# 4. When you're ready for a new concern, add the next branch
gh stack add api-routes
# → creates api-routes

# 5. Write code for the API layer
cat > api.go << 'EOF'
package api

func RegisterRoutes(mux *http.ServeMux) {
    mux.HandleFunc("/users", handleUsers)
}
EOF
git add api.go
git commit -m "Add API routes"

# 6. Add a third layer for frontend
gh stack add frontend
# → creates frontend

cat > frontend.go << 'EOF'
package frontend

func RenderDashboard(w http.ResponseWriter) {
    // calls the API endpoints from the layer below
}
EOF
git add frontend.go
git commit -m "Add frontend dashboard"

# ── Stack complete: auth → api-routes → frontend ──

# 7. Push everything and create PRs (drafts by default)
gh stack submit --auto

# 8. Verify the stack
gh stack view --json
```

> **Shortcut:** If you prefer a faster flow, `gh stack add -Am "message" branch-name` combines staging, committing, and branch creation into one command. This is useful for single-commit layers but bypasses deliberate staging.

### Making mid-stack changes

This is a critical workflow for agents. When you're working on a higher layer and realize you need to change something in a lower layer (e.g., you're building frontend components but need to add an API endpoint), **navigate down to the correct branch, make the change there, and rebase**.

```bash
# You're on frontend but need to add an API endpoint

# 1. Navigate to the API branch
gh stack down
# or: gh stack checkout api-routes

# 2. Make the change where it belongs
cat > users_api.go << 'EOF'
package api

func handleGetUser(w http.ResponseWriter, r *http.Request) {
    // new endpoint the frontend needs
}
EOF
git add users_api.go
git commit -m "Add get-user endpoint"

# 3. Rebase everything above to pick up the change
gh stack rebase --upstack

# 4. Navigate back to where you were working
gh stack top
# or: gh stack checkout frontend

# 5. Continue working — the API changes are now available
```

**Why this matters:** If you make API changes on the frontend branch, those changes will end up in the wrong PR. The API PR won't include them, and the frontend PR will have unrelated API diffs mixed in. Always put changes in the branch where they logically belong.

### Modify a mid-stack branch and sync

When you need to revisit a branch after the initial creation (e.g., responding to review feedback):

```bash
# 1. Navigate to the branch that needs changes
gh stack bottom
# or: gh stack checkout auth
# or: gh stack checkout 42  (by PR number)

# 2. Make changes and commit
cat > auth.go << 'EOF'
package auth
// updated implementation
EOF
git add auth.go
git commit -m "Fix auth token validation"

# 3. Rebase everything above this branch
gh stack rebase --upstack

# 4. Push the updated stack
gh stack push
```

### Routine sync after merges

```bash
# Single command: fetch, rebase, push, sync PR and stack state
gh stack sync

# Sync and automatically clean up local branches for merged PRs
gh stack sync --prune
```

> **Note for agents:** In non-interactive environments, the prune prompt is not shown. Use `--prune` explicitly to delete local branches for merged PRs.

> **Note for agents:** `sync` also mirrors the stack on GitHub locally. If PRs were added to the stack on github.com, their branches are pulled down and appended to the local stack automatically. If the local and remote stacks have **diverged** (you changed the local stack while the remote stack changed differently), sync can only prompt to resolve it in an interactive terminal — in non-interactive environments it aborts the sync (nothing is pushed or updated) and exits successfully with `ℹ Sync aborted`. Resolve a divergence by unstacking and recreating the stack.

### Squash-merge recovery

When a PR is squash-merged on GitHub, the original branch's commits no longer exist in the trunk history. `gh stack` detects this automatically and uses `git rebase --onto` to correctly replay remaining commits.

```bash
# After PR #1 (auth) is squash-merged on GitHub:
gh stack sync
# → fetches latest, detects the merge, fast-forwards trunk
# → rebases api-routes onto updated trunk (skips merged branch)
# → rebases frontend onto api-routes
# → pushes updated branches
# → reports: "Merged: #1"

# Verify the result
gh stack view --json
# → auth shows "isMerged": true, "state": "MERGED"
# → api-routes and frontend show updated heads
```

If `sync` hits a conflict during this process, it restores all branches to their pre-rebase state and exits with code 3. See [Handle rebase conflicts](#handle-rebase-conflicts-agent-workflow) for the resolution workflow.

### Handle rebase conflicts (agent workflow)

```bash
# 1. Start the rebase
gh stack rebase

# 2. If exit code 3 (conflict):
#    - Parse stderr for conflicted file paths
#    - Read those files to find <<<<<<< / ======= / >>>>>>> markers
#    - Edit files to resolve conflicts
#    - Stage resolved files:
git add path/to/resolved-file.go

# 3. Continue the rebase
gh stack rebase --continue

# 4. If another conflict occurs, repeat steps 2-3

# 5. If unable to resolve, abort to restore everything
gh stack rebase --abort
```

### Parsing `--json` output

```bash
# Get stack state as JSON
output=$(gh stack view --json)

# Check if any branch needs a rebase, and rebase if so
needs_rebase=$(echo "$output" | jq '[.branches[] | select(.needsRebase == true)] | length')
if [ "$needs_rebase" -gt 0 ]; then
  echo "Branches need rebase, rebasing stack..."
  gh stack rebase
fi

# Get all open PR URLs
echo "$output" | jq -r '.branches[] | select(.pr.state == "OPEN") | .pr.url'

# Find merged branches
echo "$output" | jq -r '.branches[] | select(.isMerged == true) | .name'

# Get the current branch
echo "$output" | jq -r '.currentBranch'

# Check if the stack is fully merged (all branches merged)
echo "$output" | jq '[.branches[] | .isMerged] | all'
```

### Restructure a stack (remove a branch, reorder, or rename)

Use `unstack` to tear down the stack, make structural changes, then re-init:

```bash
# 1. Remove the local tracking and the GitHub stack grouping (PRs are NOT deleted)
gh stack unstack

# 2. Make structural changes — e.g. delete a branch, reorder, rename
git branch -m old-branch-1 new-branch-1

# 3. Re-create the stack with the new structure
gh stack init --base main new-branch-1 new-branch-2 new-branch-3
```

---

## Commands

### Initialize a stack — `gh stack init`

Creates a new stack. **Always provide at least one branch name as a positional argument** — running without branch arguments triggers interactive prompts that agents cannot use.

```
gh stack init [flags] <branches...>
```

```bash
# Create a stack with a new branch
gh stack init auth
# → creates auth and checks it out

# Create a stack with new branches
gh stack init branch-a branch-b branch-c

# Use a different trunk branch
gh stack init --base develop branch-a branch-b

# Adopt existing branches into a stack (handled automatically if the branches exist)
gh stack init branch-a branch-b branch-c
```

| Flag | Description |
|------|-------------|
| `-b, --base <branch>` | Trunk branch (defaults to the repo's default branch) |

**Behavior:**

- Branch names are created exactly as given (slashes are allowed and kept as-is)
- Creates any branches that don't already exist (branching from the trunk branch)
- Existing branches are adopted automatically; missing branches are created from the trunk
- Checks out the last branch in the list
- Enables `git rerere` so conflict resolutions are remembered across rebases. On first run in a repo, this may trigger a confirmation prompt — pre-configure with `git config rerere.enabled true` to avoid it

---

### Add a branch — `gh stack add`

Add a new branch on top of the current stack. Must be run while on the topmost branch (or the trunk if the stack has no branches yet). **Always provide a branch name** — running without one triggers an interactive prompt.

```
gh stack add [flags] <branch>
```

**Recommended workflow — create the branch, then use standard git:**

```bash
# Create a new branch and switch to it
gh stack add api-routes

# Write code, stage deliberately, and commit
git add internal/api/routes.go internal/api/handlers.go
git commit -m "Add user API routes"

# Make more commits on the same branch as needed
git add internal/api/middleware.go
git commit -m "Add rate limiting middleware"
```

**Shortcut — stage, commit, and branch in one command:**

```bash
# Create a new branch, stage all changes, and commit
gh stack add -Am "Add API routes" api-routes

# Create a new branch, stage tracked files only, and commit
gh stack add -um "Fix auth bug" auth-fix
```

| Flag | Description |
|------|-------------|
| `-m, --message <string>` | Create a commit with this message |
| `-A, --all` | Stage all changes including untracked files (requires `-m`) |
| `-u, --update` | Stage tracked files only (requires `-m`) |

**Behavior notes:**

- `-A` and `-u` are mutually exclusive.
- When the current branch has no commits (e.g., right after `init`), `add -Am` commits directly on the current branch instead of creating a new one.
- **Branch names are used verbatim.** `gh stack add refactor/foo` creates a branch named `refactor/foo` — names are never prefixed or transformed. When `-m` is given without a branch name, the name is auto-generated from the commit message in date+slug format (e.g., `03-24-add_api_routes`).
- If called from a branch that is not the topmost in the stack, exits with code 5: `"can only add branches on top of the stack"`. Use `gh stack top` to switch first.
- **Uncommitted changes:** When using `gh stack add branch-name` without `-Am`, any uncommitted changes (staged or unstaged) in your working tree carry over to the new branch. This is standard git behavior — the working tree is not touched. Commit or stash changes on the current branch before running `add` if you want a clean starting point on the new branch.

---

### Push branches to remote — `gh stack push`

Push active stack branches to the remote.

```
gh stack push [flags]
```

```bash
# Push all branches
gh stack push

# Push to specific remote
gh stack push --remote upstream
```

| Flag | Description |
|------|-------------|
| `--remote <name>` | Remote to push to (use if multiple remotes exist) |

**Behavior:**

- Pushes all active (non-merged, non-queued) branches in one non-atomic multi-ref push with explicit per-branch `--force-with-lease` checks
- Some branches may update if another is rejected; fix the rejected branch and rerun the command
- Does **not** create or update pull requests — use `gh stack submit` for that

**Output (stderr):**

- `Pushed N branches` summary

---

### Submit branches and create PRs — `gh stack submit`

Push all stack branches and create PRs on GitHub. **Always pass `--auto`** — without it, `submit` prompts for a PR title for each new branch.

```bash
# Submit and auto-title new PRs (required for non-interactive use)
gh stack submit --auto

# Submit and create PRs as ready for review (not drafts)
gh stack submit --auto --open
```

| Flag | Description |
|------|-------------|
| `--auto` | Auto-generate PR titles without prompting (**required** for non-interactive use) |
| `--open` | Mark new and existing PRs as ready for review |
| `--remote <name>` | Remote to push to (use if multiple remotes exist) |

**Behavior:**

- Pushes each active (non-merged, non-queued) branch sequentially with explicit per-branch `--force-with-lease` checks; the overall submit is not atomic
- If a later branch push is rejected, earlier branch pushes and PR updates remain; fix the rejection and rerun the same command
- Creates a new PR for each branch that doesn't have one (base set to the first non-merged ancestor branch)
- After creating PRs, links them together as a **Stack** on GitHub (requires the repository to have stacks enabled)
- If every PR in the stack has already been merged, the stack is complete and can't be extended. `submit` automatically forks your unmerged branches into a **new** stack rooted at the trunk and creates it on GitHub, leaving the merged stack untouched.
- If stacks are not available (exit code 9), the repository does not have stacked PRs enabled. In interactive mode, `submit` offers to create regular (unstacked) PRs instead. In non-interactive mode, it exits with code 9.
- Syncs PR metadata for branches that already have PRs

**PR title auto-generation (`--auto`):**

- Single commit on branch → uses the commit subject as the PR title, commit body as PR body
- Multiple commits on branch → humanizes the branch name (hyphens/underscores → spaces) as the title

**Output (stderr):**

- `Created PR #N for <branch>` for each newly created PR
- `PR #N for <branch> is up to date` for existing PRs
- `Pushed and synced N branches` summary

---

### Link branches as a stack (no local tracking) — `gh stack link`

Link PRs into a stack on GitHub without creating any local tracking state. This is the recommended approach if you are managing stacked branches with other tools (jj, Sapling, git-town) and want to simply create GitHub Stacked PRs via an API.

```
gh stack link [flags] <stack-number | branch-or-pr> <branch-or-pr> [...]
```

```bash
# Link branches into a stack (pushes, creates PRs, creates stack)
gh stack link branch-a branch-b branch-c

# Use a different base branch and mark PRs as ready for review
gh stack link --base develop --open branch-a branch-b branch-c

# Link existing PRs by number
gh stack link 10 20 30

# Add branches to an existing stack of PRs
gh stack link 42 43 feature-auth feature-ui

# Append to the top of an existing stack by its stack number
# (7 is a stack number; only the new PRs/branches are listed)
gh stack link 7 48 feature-auth
```

When the first argument is a stack number, the remaining arguments are appended to the top of that stack, so you don't have to re-list its current PRs. Arguments already in the stack are skipped; arguments in a different stack are rejected. A numeric first argument is treated as a stack only when it matches an existing stack — otherwise it is a PR or branch.

| Flag | Description |
|------|---------|
| `--base <branch>` | Base branch for the bottom of the stack (defaults to the repository's default branch) |
| `--open` | Mark new and existing PRs as ready for review |
| `--remote <name>` | Remote to push to (use if multiple remotes exist) |

**Behavior:**

- Arguments are provided in stack order (bottom to top)
- Each argument can be a branch name or a PR number. Numeric arguments are tried as PR numbers first; if no PR with that number exists, the argument is treated as a branch name
- Branch arguments are pushed to the remote automatically (non-force, atomic)
- For branches without open PRs, new PRs are created with auto-generated titles and the correct base branch chaining (first branch uses `--base`, subsequent branches use the previous branch)
- Existing PRs whose base branch doesn't match the expected chain are corrected automatically
- If the PRs are not yet in a stack, a new stack is created. If some PRs are already in a stack, the stack is updated (additive only — existing PRs are never removed)
- Does **not** create or modify any local state

**Output (stderr):**

- `Pushing N branches to <remote>...`
- `Found PR #N for branch <name>` for branches with existing PRs
- `Created PR #N for <branch> (base: <base>)` for newly created PRs
- `Updated base branch for PR #N to <base>` when base branches are corrected
- `Created stack with N PRs` or `Updated stack to N PRs`

---

### Sync the stack — `gh stack sync`

Fetch, rebase, push, and sync PR state in a single command. This is the recommended command for routine synchronization.

```
gh stack sync [flags]
```

| Flag | Description |
|------|-------------|
| `--remote <name>` | Remote to fetch from and push to (use if multiple remotes exist) |
| `--prune` | Delete local branches for merged PRs |

**What it does (in order):**

1. **Fetch** latest changes from the remote
2. **Reconcile the remote stack** — mirror the GitHub stack locally. If PRs were added to the stack on GitHub, pull their branches down and append them to the local stack. If the local and remote stacks have diverged, aborts the sync in a non-interactive terminal. In an interactive terminal, offers prompts to resolve any divergence (replace local stack with remote version, delete stack on GitHub so it can be recreated, or cancel).
3. **Fast-forward trunk** to match remote (skips if already up to date, warns if diverged)
4. **Cascade rebase** all stack branches onto their updated parents (only if trunk moved). Handles merged PRs automatically. If a conflict is detected, **all branches are restored** to their pre-rebase state and the command exits with code 3 — see [Handle rebase conflicts](#handle-rebase-conflicts-agent-workflow) for the resolution workflow
5. **Push** all active branches atomically
6. **Sync PR state** from GitHub and report the status of each PR
7. **Sync the stack object** — link the open PRs into a stack on GitHub. If the PRs are not yet in a stack, a new stack is created; if some PRs are already in a stack, it is updated (additive only). This only happens when two or more PRs exist. Sync **never opens PRs** — use `gh stack submit` for that
8. **Prune** — in interactive terminals, prompts to delete local branches for merged PRs. Use `--prune` to skip the prompt. In non-interactive environments, pruning only happens when `--prune` is passed explicitly

**Output (stderr):**

- `✓ Fetched latest changes from origin`
- `Pulling N new branches from the remote stack ...` then `✓ Pulled N new branches into the stack from the remote` (when the remote stack is ahead)
- `⚠ Your local stack has diverged from the stack on GitHub` (with `Local:` / `Remote:` chains) when the stacks have diverged
- `ℹ Sync aborted — no changes were made` when a sync is cancelled
- `✓ Trunk main fast-forwarded to <sha>` or `✓ Trunk main is already up to date`
- `✓ Rebased <branch> onto <base>` per branch (if base moved)
- `✓ Pushed N branches`
- `✓ PR #N (<branch>) — Open` per branch
- `Merged: #N, #M` for merged branches
- `✓ Stack created on GitHub with N PRs` / `✓ Stack updated on GitHub with N PRs` / `✓ Linked to the existing stack on GitHub` (when two or more PRs exist)
- `✓ Pruned <branch> (merged)` per pruned branch (when pruning)
- `✓ Stack synced` when the stack object on GitHub was created/updated to match local, or `✓ Branches synced` when only the branches were synced (fewer than two PRs or stacked PRs unavailable)

---

### Rebase the stack — `gh stack rebase`

Pull from remote and cascade-rebase stack branches. Use this when `sync` reports a conflict or when you need finer control (e.g., rebase only part of the stack).

```
gh stack rebase [flags] [branch]
```

```bash
# Rebase the entire stack
gh stack rebase

# Rebase only branches from trunk to current branch
gh stack rebase --downstack

# Rebase only branches from current branch to top
gh stack rebase --upstack

# Rebase stack branches without pulling from or rebasing with trunk
gh stack rebase --no-trunk

# After resolving a conflict: stage files with `git add`, then:
gh stack rebase --continue

# Abort and restore all branches to pre-rebase state
gh stack rebase --abort
```

| Flag | Description |
|------|-------------|
| `--downstack` | Only rebase branches from trunk to the current branch |
| `--upstack` | Only rebase branches from the current branch to the top |
| `--no-trunk` | Skip trunk — only rebase stack branches onto each other (no fetch, no trunk rebase) |
| `--continue` | Continue after resolving conflicts |
| `--abort` | Abort and restore all branches |
| `--remote <name>` | Remote to fetch from (use if multiple remotes exist) |

| Argument | Description |
|----------|-------------|
| `[branch]` | Target branch (defaults to the current branch) |

**Conflict handling:** See [Handle rebase conflicts](#handle-rebase-conflicts-agent-workflow) in the Workflows section for the full resolution workflow.

**Merged PR detection:** If a branch's PR was merged on GitHub, the rebase automatically handles this using `--onto` mode and correctly replays commits on top of the merge target.

**Rerere (conflict memory):** `git rerere` is enabled by `init` so previously resolved conflicts are auto-resolved in future rebases.

**No-trunk mode:** Use `--no-trunk` to skip fetching from the remote and rebasing with the trunk branch. Only inter-branch rebases are performed (branch 2 onto branch 1, branch 3 onto branch 2, etc.). Useful when you only need to align stack branches with each other without pulling upstream changes.

---

### View the stack — `gh stack view`

Display the current stack's branches, PR status, and recent commits. **Always pass `--json`** — without it, this command launches an interactive TUI that agents cannot operate.

```bash
# Always use --json
gh stack view --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output stack data as JSON to stdout (**required** for non-interactive use) |

**`--json` output format:**

```json
{
  "trunk": "main",
  "currentBranch": "api-routes",
  "branches": [
    {
      "name": "auth",
      "head": "abc1234...",
      "base": "def5678...",
      "isCurrent": false,
      "isMerged": true,
      "isQueued": false,
      "needsRebase": false,
      "pr": {
        "number": 42,
        "url": "https://github.com/owner/repo/pull/42",
        "state": "MERGED"
      }
    },
    {
      "name": "api-routes",
      "head": "789abcd...",
      "base": "abc1234...",
      "isCurrent": true,
      "isMerged": false,
      "isQueued": false,
      "needsRebase": false,
      "pr": {
        "number": 43,
        "url": "https://github.com/owner/repo/pull/43",
        "state": "OPEN"
      }
    }
  ]
}
```

Fields per branch:
- `name` — branch name
- `head` — current HEAD SHA
- `base` — parent branch's HEAD SHA at last sync
- `isCurrent` — whether this is the checked-out branch
- `isMerged` — whether the PR has been merged
- `isQueued` — whether the PR is queued for merge (in a merge queue)
- `needsRebase` — whether the base branch is not an ancestor (non-linear history)
- `pr` — PR metadata (omitted if no PR exists). `state` is `"OPEN"`, `"MERGED"`, or `"QUEUED"`.

---

### Navigate the stack

Move between branches without remembering branch names. These commands are fully non-interactive.

```bash
gh stack up          # Move up one branch (further from trunk)
gh stack up 3        # Move up three branches
gh stack down        # Move down one branch (closer to trunk)
gh stack down 2      # Move down two branches
gh stack top         # Jump to the top of the stack (furthest from trunk)
gh stack bottom      # Jump to the bottom (first non-merged branch above trunk)
gh stack trunk       # Jump to the trunk branch (e.g. main)
```

Navigation clamps to stack bounds. Merged branches are skipped when navigating from active branches.

---

### Check out a stack — `gh stack checkout`

Check out a stack by stack number, pull request number, PR URL, or branch name. **Always provide an argument** — running `gh stack checkout` without arguments triggers an interactive selection menu.

```
gh stack checkout <stack-number | pr-number | pr-url | branch>
```

```bash
# By stack number (the identifier shown in the GitHub stack UI)
gh stack checkout 7

# By PR number (pulls from GitHub)
gh stack checkout 42

# By PR URL
gh stack checkout https://github.com/owner/repo/pull/42

# By branch name (local only)
gh stack checkout feature-auth
```

A bare number is resolved as a **stack number first** (the identifier shown in the GitHub stack UI); if no stack has that number it is tried as a PR number, then a branch name. When a stack or PR number (or PR URL) is provided, the command fetches the stack on GitHub, pulls the branches, and sets up the stack locally. If the stack already exists locally and matches, it switches to the branch.

> **⚠️ Agent warning:** If the local and remote stacks have different branch compositions, this command triggers an interactive conflict-resolution prompt that cannot be bypassed with a flag. To avoid this: run `gh stack unstack --local` first to remove the conflicting local tracking state (this keeps the stack on GitHub intact), then retry `gh stack checkout <pr-number>`.

When a branch name is provided, the command resolves it against locally tracked stacks only. This is always safe for non-interactive use.

---

### Remove a stack — `gh stack unstack`

Tear down a stack so you can restructure it — remove a branch, reorder branches, rename branches, or make other large changes. After unstacking, use `gh stack init` to re-create the stack with the desired structure.

Unstacking only removes the stack grouping (on GitHub and/or locally); it never deletes the underlying pull requests or branches.

With no argument, the command targets the active stack — the one containing the currently checked out branch — unstacking it on GitHub and removing local tracking.

Provide a stack number to unstack a specific stack on GitHub. This works from anywhere in the repository, whether or not the stack is checked out locally — the number is unstacked directly through the GitHub API (like `gh stack link`, no local tracking required). If the stack is also tracked locally, its local tracking is removed as well.

```
gh stack unstack [<stack-number>] [flags]
```

```bash
# Tear down the current stack — removes local tracking and the GitHub grouping (PRs are NOT deleted), then rebuild
gh stack unstack
gh stack init --base main branch-2 branch-1 branch-3 # reordered

# Unstack a specific stack by its number, from anywhere in the repo
gh stack unstack 7

# Only remove local tracking (keep the stack on GitHub)
gh stack unstack --local
```

| Flag | Description |
|------|-------------|
| `--local` | Only remove the stack locally (keep it on GitHub); never contacts GitHub |

> **Note for agents:** `gh stack unstack <number>` is a remote-first API wrapper — it unstacks on GitHub by number from anywhere in the repo, tracked locally or not, and is safe for non-interactive use. `--local` never contacts GitHub; combining `--local` with a number that isn't tracked locally is an error. An unknown stack number returns a "not found on GitHub" error (exit code 2).

---

## Output conventions

- **Status messages** go to **stderr** with emoji prefixes: `✓` (success), `✗` (error), `⚠` (warning), `ℹ` (info).
- **Data output** (e.g., `view --json`) goes to **stdout**.
- When piping output, use `2>/dev/null` to suppress status messages if only data output is needed.

## Exit codes and error recovery

| Code | Meaning | Agent action |
|------|---------|-------------|
| 0 | Success | Proceed normally |
| 1 | Generic error | Read stderr for details; may indicate commit/push failure |
| 2 | Not in a stack | Run `gh stack init` to create a stack first |
| 3 | Rebase conflict | Parse stderr for conflicted file paths, resolve conflicts, run `gh stack rebase --continue` |
| 4 | GitHub API failure | Check `gh auth status`, retry the command |
| 5 | Invalid arguments | Fix the command invocation (check flags and arguments) |
| 6 | Disambiguation required | A branch belongs to multiple stacks. Run `gh stack checkout <specific-branch>` to switch to a non-shared branch first |
| 7 | Rebase already in progress | Run `gh stack rebase --continue` (after resolving conflicts) or `gh stack rebase --abort` to start over |
| 8 | Stack is locked | Another `gh stack` process is writing the stack file. Wait and retry — the lock times out after 5 seconds |
| 9 | Stacked PRs unavailable | The repository does not have stacked PRs enabled. Tell the user that stacks must be enabled on the repository first |
| 10 | Modify recovery required | A `gh stack modify` session was interrupted. This skill does not use `modify`, so agents should not produce this; if the repo is left in this state, run `gh stack modify --abort` to restore the pre-modify state |

## Known limitations

1. **Stacks are strictly linear.** Branching stacks (multiple children on a single parent) are not supported. Each branch has exactly one parent and at most one child. If you need parallel workstreams, use separate stacks.
2. **Stack disambiguation cannot be bypassed.** If the current branch is the trunk of multiple stacks, commands error with code 6. Check out a non-shared branch first.
3. **Multiple remotes require `--remote` or config.** If more than one remote is configured, set `remote.pushDefault` in git config, or pass `--remote <name>` to the commands that accept it (`push`, `submit`, `sync`, `rebase`, `link`). `checkout`, `modify`, and `trunk` have no `--remote` flag and rely on `remote.pushDefault`.
4. **Remote stack checkout requires a stack or PR number.** `checkout` with a branch name only works with locally tracked stacks. Use a stack number or PR number (e.g. `gh stack checkout 7` or `gh stack checkout 123`) to pull a stack from GitHub.
5. **PR title and body are auto-generated.** There is no flag to set a custom PR title or body during `submit`. The title and body are generated from commit messages plus a footer. Use `gh pr edit` to modify PR title and body after creation.
