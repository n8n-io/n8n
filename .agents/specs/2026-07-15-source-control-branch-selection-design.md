# Source Control: per-commit branch selection & feature-branch creation

- **Date:** 2026-07-15
- **Status:** Approved (design)
- **Area:** `packages/cli/src/modules/source-control.ee`, `packages/@n8n/api-types`, `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee`

## Problem

Today an n8n instance is fixed to a single git branch, chosen once in Admin
Settings. Every commit (push) and every pull targets that one branch. Users who
work with feature branches cannot pick a branch per commit, nor create a new
branch from the instance.

## Goal

1. Connect a repository to the instance without being locked to one branch for
   all operations.
2. Let the user choose the target branch in the commit (push) window.
3. Optionally create a new branch from the commit window, feature-branch style.

## Non-goals

- No PR/MR creation (provider-specific; out of scope).
- No change to the read-only-instance flag semantics.
- No per-pull branch selector.

## Model

- The repository connects; Admin Settings keeps a **default branch** (the
  existing `branchName` field, relabeled in UI/i18n from "Branch" to
  "Default branch"). No schema change.
- **Pull / reset / status** always operate on the admin default branch. Pull
  explicitly checks out the default branch first, so a prior feature-branch
  commit never leaves `HEAD` pointing elsewhere.
- The **commit window** selects the push target: an existing branch, or a new
  branch created off the latest default branch.
- The **read-only-instance flag** (`branchReadOnly`) is unchanged and
  orthogonal. It marks the whole instance read-only (blocks editing and,
  consequently, pushing). When set, the commit window does not apply.

### Clarification on `branchReadOnly`

`branchReadOnly` is a whole-instance "read-only environment" toggle, not a
git-branch protection. It blocks instance editing on the frontend
(`useWorkflowSaving.ts:160`, `useGlobalEntityCreation.ts`,
`MainSidebarHeader.vue`) and blocks push on the backend
(`source-control.service.ee.ts:331`). It is left untouched by this work.

## Backend (`source-control.ee`)

### DTO — `packages/@n8n/api-types/src/dto/source-control/push-work-folder-request.dto.ts`

Add two optional fields to `PushWorkFolderRequestDto`:

- `branch?: string` — target branch for this push. When omitted, the admin
  default branch is used (current behavior).
- `createBranch?: boolean` — when `true`, `branch` names a new branch to be
  created off the latest default branch.

Validate `branch` with a proper git ref-name rule (reject spaces, the
characters `~ ^ : ? * [ \`, `..`, a leading `-`, trailing `.lock`, empty
segments) rather than the current loose `/^[a-zA-Z0-9]/` used on preferences.

### Service — `source-control.service.ee.ts`

In `pushWorkfolderWithoutLock`, replace the hardcoded
`this.sourceControlPreferencesService.getBranchName()` (line ~476) with the
resolved target branch. The whole method is already mutex-guarded.

Resolution logic:

- `createBranch === true`: `fetch` → checkout default → reset to
  `origin/<default>` → `checkout -b <branch>` → export DB → commit →
  `push -u origin <branch>`.
- `branch` given and existing: `fetch` → checkout `<branch>` → export DB →
  commit → push.
- no `branch` (or `branch === default`): current behavior unchanged.

Before exporting, force-sync the working tree (the DB is the source of truth;
files are re-exported anyway) so a branch switch never fails on stale exported
files.

On push failure the existing recovery (reset to `origin/<branch>`) applies to
the resolved branch.

### Pull — `pullWorkfolderWithoutLock`

Ensure the default branch is checked out before pulling, so a prior
feature-branch commit does not leave `HEAD` on another branch.

### Git service — `source-control-git.service.ee.ts`

- Add a `createBranch(name, base)` helper (`checkout -b` from base).
- Reuse existing `getBranches`, `setBranch`, `push`, `fetch`, `commit`,
  `stage`.

## Frontend (`sourceControl.ee`)

### `components/SourceControlPushModal.vue`

Add a branch control above the commit message (chosen UI: dropdown + toggle):

- A dropdown of existing branches, defaulting to the admin default branch.
- A "New branch" toggle. When on, the dropdown is replaced by a text input
  with a "base: `<default>`" hint and client-side git-ref-name validation.
- On modal open, call the existing `getBranches()` to populate the dropdown
  (show a loading state during the fetch).

### API / store / types

- `sourceControl.api.ts`, `sourceControl.store.ts`, `sourceControl.types.ts`:
  thread `branch` and `createBranch` through the push payload.

### `views/SettingsSourceControl.vue`

- Relabel the branch select from "Branch" to "Default branch" (i18n string in
  `@n8n/i18n`).

## Testing

### Backend unit (Vitest, mock git service)

- Push to an existing non-default branch.
- Create a new branch off default and push with upstream.
- No branch given → default branch (unchanged behavior).
- Invalid branch name rejected by DTO validation.
- Read-only instance still blocks push.

### Frontend unit (Vitest)

- Modal renders the branch dropdown populated from `getBranches`.
- Toggle swaps dropdown for the new-branch text input.
- Invalid branch name blocks submit.
- Push payload carries `branch` / `createBranch` correctly.

### E2E (Playwright) — optional, may defer

- Commit to a newly created feature branch against a git remote fixture.

## Risks & mitigations

- **Branch switch touches the shared working clone.** Already mutex-guarded;
  force-sync the working tree before export so checkout never conflicts with
  stale exported files.
- **Target existing branch behind remote → non-fast-forward push rejected.**
  Existing failure path resets to `origin/<branch>`; the `force` toggle already
  exists. No new behavior.

## Migration

No DB migration. `branchName` keeps its meaning as the default branch;
existing connected instances keep working with their current branch as the
default.
