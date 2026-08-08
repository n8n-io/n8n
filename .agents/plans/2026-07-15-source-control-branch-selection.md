# Source Control Branch Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick the target git branch in the commit window (and optionally create a new feature branch off the default), instead of being locked to one branch fixed in Admin Settings.

**Architecture:** Admin Settings keeps `branchName` but relabels it "Default branch" (used for pull/reset/status and as the commit default). The push DTO gains `branch` + `createBranch`. The push service resolves the target branch, checks it out (creating from the default when asked) before exporting/committing, and pushes to it. Pull explicitly re-checks-out the default branch first. The commit modal gains a branch dropdown + "New branch" toggle.

**Tech Stack:** TypeScript, zod (`@n8n/api-types` DTOs), simple-git (backend git service), Vue 3 + Pinia (`editor-ui`), Vitest.

## Global Constraints

- Never use `any`; use proper types or `unknown` (repo TS rule).
- No `ApplicationError`; use `UserError` / `OperationalError` / `UnexpectedError`.
- All new UI text goes through `@n8n/i18n` (`packages/frontend/@n8n/i18n/src/locales/en.json`).
- `data-testid` must be a single value.
- Backend source-control module path: `packages/cli/src/modules/source-control.ee/`.
- Frontend feature path: `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/`.
- Run tests from within the package dir (`pushd`/`popd`). Backend cli tests: `pnpm test <file>` inside `packages/cli`. api-types tests inside `packages/@n8n/api-types`. Frontend tests inside `packages/frontend/editor-ui`.
- The git branch validator must be defined once in `@n8n/api-types` and reused by both the DTO and the frontend (DRY).
- `SOURCE_CONTROL_ORIGIN = 'origin'` and the default branch getter is `sourceControlPreferencesService.getBranchName()`.

---

### Task 1: Shared git branch-name validator + DTO fields

**Files:**
- Create: `packages/@n8n/api-types/src/utils/git-branch-name.ts`
- Create: `packages/@n8n/api-types/src/utils/__tests__/git-branch-name.test.ts`
- Modify: `packages/@n8n/api-types/src/dto/source-control/push-work-folder-request.dto.ts`
- Modify: `packages/@n8n/api-types/src/dto/source-control/__tests__/push-work-folder-request.dto.test.ts` (create if absent)
- Modify: `packages/@n8n/api-types/src/index.ts` (export the validator)

**Interfaces:**
- Produces: `isValidGitBranchName(name: string): boolean` — exported from `@n8n/api-types`.
- Produces: `PushWorkFolderRequestDto` now has `branch?: string` and `createBranch?: boolean`.

- [ ] **Step 1: Write the failing validator test**

Create `packages/@n8n/api-types/src/utils/__tests__/git-branch-name.test.ts`:

```typescript
import { isValidGitBranchName } from '../git-branch-name';

describe('isValidGitBranchName', () => {
	test.each([
		'main',
		'develop',
		'feat/my-thing',
		'release/1.2.3',
		'user/feature_x',
	])('accepts valid name %s', (name) => {
		expect(isValidGitBranchName(name)).toBe(true);
	});

	test.each([
		'',
		' ',
		'has space',
		'-leading-dash',
		'/leading-slash',
		'trailing-slash/',
		'double//slash',
		'dot..dot',
		'ends.lock'.replace('ends', 'branch.lock') /* branch.lock */,
		'has~tilde',
		'has^caret',
		'has:colon',
		'has?question',
		'has*star',
		'has[bracket',
		'has\\backslash',
		'has@{seq',
		'ends.',
	])('rejects invalid name %j', (name) => {
		expect(isValidGitBranchName(name)).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (inside `packages/@n8n/api-types`): `pnpm test src/utils/__tests__/git-branch-name.test.ts`
Expected: FAIL — cannot find module `../git-branch-name`.

- [ ] **Step 3: Implement the validator**

Create `packages/@n8n/api-types/src/utils/git-branch-name.ts`:

```typescript
/**
 * Approximates `git check-ref-format --branch`. Rejects names git would refuse
 * so branch creation/checkout fails fast with a clear message instead of deep
 * in the git layer.
 */
export function isValidGitBranchName(name: string): boolean {
	if (!name || name.length === 0) return false;
	if (/\s/.test(name)) return false; // no whitespace
	if (name.startsWith('-') || name.startsWith('/')) return false;
	if (name.endsWith('/') || name.endsWith('.') || name.endsWith('.lock')) return false;
	if (name.includes('..') || name.includes('//') || name.includes('@{')) return false;
	// disallowed characters: ~ ^ : ? * [ \ and ASCII control chars
	if (/[~^:?*[\\\x00-\x1f\x7f]/.test(name)) return false;
	return true;
}
```

- [ ] **Step 4: Run validator test to verify it passes**

Run: `pnpm test src/utils/__tests__/git-branch-name.test.ts`
Expected: PASS.

- [ ] **Step 5: Export the validator**

In `packages/@n8n/api-types/src/index.ts`, add an export line alongside the other `export * from './...'` lines:

```typescript
export * from './utils/git-branch-name';
```

(If `src/utils` has no barrel, add the direct export above; match the file's existing export style.)

- [ ] **Step 6: Write the failing DTO test**

Create/modify `packages/@n8n/api-types/src/dto/source-control/__tests__/push-work-folder-request.dto.test.ts`:

```typescript
import { PushWorkFolderRequestDto } from '../push-work-folder-request.dto';

describe('PushWorkFolderRequestDto', () => {
	test('accepts a valid target branch', () => {
		const result = PushWorkFolderRequestDto.safeParse({
			fileNames: [],
			branch: 'feat/my-thing',
			createBranch: true,
		});
		expect(result.success).toBe(true);
	});

	test('rejects an invalid branch name', () => {
		const result = PushWorkFolderRequestDto.safeParse({
			fileNames: [],
			branch: 'bad branch',
		});
		expect(result.success).toBe(false);
	});

	test('allows omitting branch (backwards compatible)', () => {
		const result = PushWorkFolderRequestDto.safeParse({ fileNames: [] });
		expect(result.success).toBe(true);
	});
});
```

- [ ] **Step 7: Run DTO test to verify it fails**

Run: `pnpm test src/dto/source-control/__tests__/push-work-folder-request.dto.test.ts`
Expected: FAIL — invalid branch currently parses successfully (no `branch` field yet).

- [ ] **Step 8: Add fields to the DTO**

Replace `packages/@n8n/api-types/src/dto/source-control/push-work-folder-request.dto.ts`:

```typescript
import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { isValidGitBranchName } from '../../utils/git-branch-name';
import { Z } from '../../zod-class';

export class PushWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
	commitMessage: z.string().optional(),
	fileNames: z.array(SourceControlledFileSchema),
	branch: z
		.string()
		.refine(isValidGitBranchName, { message: 'Invalid git branch name' })
		.optional(),
	createBranch: z.boolean().optional(),
}) {}
```

- [ ] **Step 9: Run DTO test to verify it passes**

Run: `pnpm test src/dto/source-control/__tests__/push-work-folder-request.dto.test.ts`
Expected: PASS.

- [ ] **Step 10: Typecheck and commit**

Run (inside `packages/@n8n/api-types`): `pnpm typecheck`
Expected: no errors.

```bash
git add packages/@n8n/api-types/src/utils/git-branch-name.ts \
  packages/@n8n/api-types/src/utils/__tests__/git-branch-name.test.ts \
  packages/@n8n/api-types/src/dto/source-control/push-work-folder-request.dto.ts \
  packages/@n8n/api-types/src/dto/source-control/__tests__/push-work-folder-request.dto.test.ts \
  packages/@n8n/api-types/src/index.ts
git commit -m "feat(api-types): add branch selection fields to push DTO"
```

---

### Task 2: Git service — create-branch, force checkout, upstream push

**Files:**
- Modify: `packages/cli/src/modules/source-control.ee/source-control-git.service.ee.ts`
- Test: `packages/cli/src/modules/source-control.ee/__tests__/source-control-git.service.ee.test.ts` (create if absent; check for an existing test file first)

**Interfaces:**
- Consumes: existing `this.git` (simple-git instance), `SOURCE_CONTROL_ORIGIN`, `SOURCE_CONTROL_DEFAULT_BRANCH`.
- Produces:
  - `createBranchFrom(newBranch: string, baseBranch: string): Promise<void>`
  - `checkoutExistingBranch(branch: string): Promise<void>`
  - `push(options: { force: boolean; branch: string; setUpstream?: boolean }): Promise<PushResult>` (extended signature — `setUpstream` optional, defaults false).

- [ ] **Step 1: Write the failing git-service test**

In the git service test file (create `__tests__/source-control-git.service.ee.test.ts` if none), add. Adjust the mock/instantiation to match the existing test setup in the module if one already exists:

```typescript
import { mock } from 'jest-mock-extended';
import type { SimpleGit } from 'simple-git';
import { SourceControlGitService } from '../source-control-git.service.ee';

describe('SourceControlGitService branch ops', () => {
	const git = mock<SimpleGit>();
	const service = new SourceControlGitService(mock(), mock(), mock());
	// @ts-expect-error assign private git instance for the test
	service.git = git;

	beforeEach(() => jest.clearAllMocks());

	test('createBranchFrom resets base then creates the new branch', async () => {
		await service.createBranchFrom('feat/x', 'main');
		expect(git.checkout).toHaveBeenCalledWith('main', ['-f']);
		expect(git.raw).toHaveBeenCalledWith(['reset', '--hard', 'origin/main']);
		expect(git.checkoutBranch).toHaveBeenCalledWith('feat/x', 'main');
	});

	test('checkoutExistingBranch force-checks-out and sets upstream', async () => {
		await service.checkoutExistingBranch('feat/x');
		expect(git.checkout).toHaveBeenCalledWith('feat/x', ['-f']);
		expect(git.branch).toHaveBeenCalledWith(['--set-upstream-to=origin/feat/x', 'feat/x']);
	});

	test('push with setUpstream passes -u', async () => {
		await service.push({ force: false, branch: 'feat/x', setUpstream: true });
		expect(git.push).toHaveBeenCalledWith('origin', 'feat/x', ['-u']);
	});
});
```

> Note: n8n cli uses Vitest, not Jest. If the surrounding tests import from `vitest` and use `vi`/`mock` helpers, mirror that style (`import { mock } from 'vitest-mock-extended'`, `vi.clearAllMocks()`). Match whatever the neighboring test files in this module already do.

- [ ] **Step 2: Run test to verify it fails**

Run (inside `packages/cli`): `pnpm test src/modules/source-control.ee/__tests__/source-control-git.service.ee.test.ts`
Expected: FAIL — `createBranchFrom` / `checkoutExistingBranch` not defined; `push` ignores `setUpstream`.

- [ ] **Step 3: Add the git-service methods**

In `source-control-git.service.ee.ts`, add after `setBranch` (around line 386):

```typescript
async checkoutExistingBranch(branch: string): Promise<void> {
	if (!this.git) {
		throw new UnexpectedError('Git is not initialized (checkoutExistingBranch)');
	}
	await this.git.checkout(branch, ['-f']);
	await this.git.branch([`--set-upstream-to=${SOURCE_CONTROL_ORIGIN}/${branch}`, branch]);
}

async createBranchFrom(newBranch: string, baseBranch: string): Promise<void> {
	if (!this.git) {
		throw new UnexpectedError('Git is not initialized (createBranchFrom)');
	}
	// Start from the latest remote state of the base branch, then branch off it.
	await this.git.checkout(baseBranch, ['-f']);
	await this.git.raw(['reset', '--hard', `${SOURCE_CONTROL_ORIGIN}/${baseBranch}`]);
	await this.git.checkoutBranch(newBranch, baseBranch);
}
```

- [ ] **Step 4: Extend `push` to support upstream**

Replace the existing `push` method (lines ~443-458):

```typescript
async push(
	options: { force: boolean; branch: string; setUpstream?: boolean } = {
		force: false,
		branch: SOURCE_CONTROL_DEFAULT_BRANCH,
	},
): Promise<PushResult> {
	const { force, branch, setUpstream } = options;
	if (!this.git) {
		throw new UnexpectedError('Git is not initialized (push)');
	}
	await this.setGitCommand();
	const flags: string[] = [];
	if (setUpstream) flags.push('-u');
	if (force) flags.push('-f');
	if (flags.length > 0) {
		return await this.git.push(SOURCE_CONTROL_ORIGIN, branch, flags);
	}
	return await this.git.push(SOURCE_CONTROL_ORIGIN, branch);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/modules/source-control.ee/__tests__/source-control-git.service.ee.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck and commit**

Run (inside `packages/cli`): `pnpm typecheck`

```bash
git add packages/cli/src/modules/source-control.ee/source-control-git.service.ee.ts \
  packages/cli/src/modules/source-control.ee/__tests__/source-control-git.service.ee.test.ts
git commit -m "feat(source-control): add branch create/checkout git helpers"
```

---

### Task 3: Push service — resolve and switch target branch

**Files:**
- Modify: `packages/cli/src/modules/source-control.ee/source-control.service.ee.ts`
- Test: `packages/cli/src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts` (existing — check first)

**Interfaces:**
- Consumes: `PushWorkFolderRequestDto` (`branch`, `createBranch`) from Task 1; `gitService.createBranchFrom`, `gitService.checkoutExistingBranch`, `gitService.push({ setUpstream })` from Task 2.
- Produces: `pushWorkfolderWithoutLock` commits and pushes to the resolved branch.

- [ ] **Step 1: Write the failing service test**

Add to the service test file (mirror the existing mock setup in that file for `gitService`, `sourceControlPreferencesService`, export/import services):

```typescript
describe('pushWorkfolder branch selection', () => {
	// Assumes the suite's existing beforeEach wires mocks so a plain push resolves.
	// getBranchName() returns the default branch.

	test('creates a new branch off the default before committing', async () => {
		sourceControlPreferencesService.getBranchName.mockReturnValue('main');
		await service.pushWorkfolder(user, {
			fileNames: [],
			branch: 'feat/x',
			createBranch: true,
			commitMessage: 'msg',
		});
		expect(gitService.createBranchFrom).toHaveBeenCalledWith('feat/x', 'main');
		expect(gitService.push).toHaveBeenCalledWith(
			expect.objectContaining({ branch: 'feat/x', setUpstream: true }),
		);
	});

	test('checks out an existing branch before committing', async () => {
		sourceControlPreferencesService.getBranchName.mockReturnValue('main');
		await service.pushWorkfolder(user, {
			fileNames: [],
			branch: 'develop',
			commitMessage: 'msg',
		});
		expect(gitService.checkoutExistingBranch).toHaveBeenCalledWith('develop');
		expect(gitService.push).toHaveBeenCalledWith(
			expect.objectContaining({ branch: 'develop', setUpstream: false }),
		);
	});

	test('falls back to the default branch when none given', async () => {
		sourceControlPreferencesService.getBranchName.mockReturnValue('main');
		await service.pushWorkfolder(user, { fileNames: [], commitMessage: 'msg' });
		expect(gitService.createBranchFrom).not.toHaveBeenCalled();
		expect(gitService.checkoutExistingBranch).not.toHaveBeenCalled();
		expect(gitService.push).toHaveBeenCalledWith(
			expect.objectContaining({ branch: 'main' }),
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (inside `packages/cli`): `pnpm test src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts -t "branch selection"`
Expected: FAIL — service ignores `branch`/`createBranch`; still pushes the default.

- [ ] **Step 3: Add the branch-prep helper**

In `source-control.service.ee.ts`, add a private method (near `setBranch`, ~line 285):

```typescript
/**
 * Resolves the branch a push targets and switches the working clone onto it.
 * Called before export/commit so the commit lands on the right branch.
 * Returns the target branch and whether it was newly created (needs upstream).
 */
private async prepareBranchForPush(
	options: PushWorkFolderRequestDto,
): Promise<{ targetBranch: string; isNewBranch: boolean; defaultBranch: string }> {
	const defaultBranch = this.sourceControlPreferencesService.getBranchName();
	const requested = options.branch?.trim();

	if (!requested || requested === defaultBranch) {
		return { targetBranch: defaultBranch, isNewBranch: false, defaultBranch };
	}

	await this.gitService.fetch();

	if (options.createBranch) {
		await this.gitService.createBranchFrom(requested, defaultBranch);
		return { targetBranch: requested, isNewBranch: true, defaultBranch };
	}

	await this.gitService.checkoutExistingBranch(requested);
	return { targetBranch: requested, isNewBranch: false, defaultBranch };
}
```

- [ ] **Step 4: Call it before export and use the result at push time**

In `pushWorkfolderWithoutLock`, right after `const context = await this.sourceControlContextFactory.createContext(user);` (line ~335) and before the `filesToPush` mapping, insert:

```typescript
		const { targetBranch, isNewBranch, defaultBranch } =
			await this.prepareBranchForPush(options);
```

Then replace the push block (lines ~476-494). Old:

```typescript
		const branchName = this.sourceControlPreferencesService.getBranchName();
		let pushResult: PushResult | undefined;
		try {
			pushResult = await this.gitService.push({
				branch: branchName,
				force: options.force ?? false,
			});

			// Only mark files as pushed after successful push
			statusResult.forEach((result) => (result.pushed = true));
		} catch (error) {
			this.logger.error('Failed to push changes', { error });
			try {
				await this.gitService.resetBranch({ hard: true, target: `origin/${branchName}` });
			} catch (resetError) {
				this.logger.error('Failed to reset branch after push error', { error: resetError });
			}
			throw error;
		}
```

New:

```typescript
		let pushResult: PushResult | undefined;
		try {
			pushResult = await this.gitService.push({
				branch: targetBranch,
				force: options.force ?? false,
				setUpstream: isNewBranch,
			});

			// Only mark files as pushed after successful push
			statusResult.forEach((result) => (result.pushed = true));
		} catch (error) {
			this.logger.error('Failed to push changes', { error });
			try {
				// A brand-new branch has no origin ref yet; fall back to the default.
				const resetTarget = isNewBranch
					? `origin/${defaultBranch}`
					: `origin/${targetBranch}`;
				await this.gitService.resetBranch({ hard: true, target: resetTarget });
			} catch (resetError) {
				this.logger.error('Failed to reset branch after push error', { error: resetError });
			}
			throw error;
		}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts -t "branch selection"`
Expected: PASS.

- [ ] **Step 6: Run the full service test file (regression)**

Run: `pnpm test src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts`
Expected: PASS (existing push tests still pass — plain push resolves to the default branch).

- [ ] **Step 7: Typecheck and commit**

Run (inside `packages/cli`): `pnpm typecheck`

```bash
git add packages/cli/src/modules/source-control.ee/source-control.service.ee.ts \
  packages/cli/src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts
git commit -m "feat(source-control): push to selected or newly created branch"
```

---

### Task 4: Pull re-checks-out the default branch

**Files:**
- Modify: `packages/cli/src/modules/source-control.ee/source-control.service.ee.ts`
- Test: `packages/cli/src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts`

**Interfaces:**
- Consumes: `gitService.checkoutExistingBranch` (Task 2), `sourceControlPreferencesService.getBranchName()`.
- Produces: `pullWorkfolderWithoutLock` always operates on the default branch.

- [ ] **Step 1: Write the failing test**

```typescript
test('pull checks out the default branch first', async () => {
	sourceControlPreferencesService.getBranchName.mockReturnValue('main');
	await service.pullWorkfolder(user, { force: true, autoPublish: 'never' });
	expect(gitService.checkoutExistingBranch).toHaveBeenCalledWith('main');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts -t "pull checks out"`
Expected: FAIL — pull never checks out the default branch.

- [ ] **Step 3: Add checkout to pull**

In `pullWorkfolderWithoutLock`, right after `await this.sanityCheck();` (line ~523), insert:

```typescript
		// Pull always targets the default branch; a prior feature-branch commit
		// may have left HEAD elsewhere, so switch back first.
		const defaultBranch = this.sourceControlPreferencesService.getBranchName();
		await this.gitService.checkoutExistingBranch(defaultBranch);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts -t "pull checks out"`
Expected: PASS.

- [ ] **Step 5: Run full file (regression), typecheck, commit**

Run: `pnpm test src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts` → PASS
Run: `pnpm typecheck`

```bash
git add packages/cli/src/modules/source-control.ee/source-control.service.ee.ts \
  packages/cli/src/modules/source-control.ee/__tests__/source-control.service.ee.test.ts
git commit -m "feat(source-control): pull always targets the default branch"
```

---

### Task 5: Frontend store — thread branch + createBranch through push

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/sourceControl.store.ts`
- Test: `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/__tests__/sourceControl.store.test.ts` (create if absent; check first)

**Interfaces:**
- Consumes: `vcApi.pushWorkfolder` (already forwards a `PushWorkFolderRequestDto` verbatim — no api.ts change needed).
- Produces: `pushWorkfolder(data: { commitMessage; fileNames; force; branch?; createBranch? })` forwards the new fields.

- [ ] **Step 1: Write the failing store test**

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useSourceControlStore } from '../sourceControl.store';
import * as vcApi from '../sourceControl.api';

vi.mock('../sourceControl.api');

describe('sourceControl store pushWorkfolder', () => {
	beforeEach(() => setActivePinia(createPinia()));

	test('forwards branch and createBranch', async () => {
		const spy = vi.spyOn(vcApi, 'pushWorkfolder').mockResolvedValue({ files: [], commit: null });
		const store = useSourceControlStore();
		await store.pushWorkfolder({
			commitMessage: 'msg',
			fileNames: [],
			force: true,
			branch: 'feat/x',
			createBranch: true,
		});
		expect(spy).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ branch: 'feat/x', createBranch: true }),
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (inside `packages/frontend/editor-ui`): `pnpm test src/features/integrations/sourceControl.ee/__tests__/sourceControl.store.test.ts`
Expected: FAIL — `branch`/`createBranch` not forwarded.

- [ ] **Step 3: Update the store action**

Replace `pushWorkfolder` in `sourceControl.store.ts` (lines ~45-56):

```typescript
	const pushWorkfolder = async (data: {
		commitMessage: string;
		fileNames: SourceControlledFile[];
		force: boolean;
		branch?: string;
		createBranch?: boolean;
	}) => {
		state.commitMessage = data.commitMessage;
		return await vcApi.pushWorkfolder(rootStore.restApiContext, {
			force: data.force,
			commitMessage: data.commitMessage,
			fileNames: data.fileNames,
			branch: data.branch,
			createBranch: data.createBranch,
		});
	};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/features/integrations/sourceControl.ee/__tests__/sourceControl.store.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run (inside `packages/frontend/editor-ui`): `pnpm typecheck`

```bash
git add packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/sourceControl.store.ts \
  packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/__tests__/sourceControl.store.test.ts
git commit -m "feat(source-control): forward branch selection from store"
```

---

### Task 6: Commit modal — branch dropdown + New branch toggle

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue`
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json`
- Test: `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/__tests__/SourceControlPushModal.*.test.ts` (extend existing modal test if present; else create)

**Interfaces:**
- Consumes: `sourceControlStore.getBranches()` (populates `preferences.branches` + `preferences.branchName`), `sourceControlStore.preferences.branchName` (default branch), `isValidGitBranchName` from `@n8n/api-types`, `sourceControlStore.pushWorkfolder` (Task 5).
- Produces: `commitAndPush` sends `branch` + `createBranch`.

- [ ] **Step 1: Add i18n strings**

In `packages/frontend/@n8n/i18n/src/locales/en.json`, add near the push modal keys (after line ~3794):

```json
	"settings.sourceControl.modals.push.branch": "Branch",
	"settings.sourceControl.modals.push.branch.newBranch": "New branch",
	"settings.sourceControl.modals.push.branch.newBranchPlaceholder": "e.g. feat/my-change",
	"settings.sourceControl.modals.push.branch.base": "Base: {branch}",
	"settings.sourceControl.modals.push.branch.invalid": "Invalid git branch name",
```

- [ ] **Step 2: Write the failing modal test**

Add a test that mounts the modal (reuse the existing modal test's render helper / mocks) and asserts the branch select renders and the toggle swaps to a text input:

```typescript
test('renders branch selector and toggles to new-branch input', async () => {
	// render helper from the existing modal test; store.getBranches mocked to
	// set preferences.branches = ['main', 'develop'], preferences.branchName = 'main'
	const { getByTestId, queryByTestId } = renderModal();
	expect(getByTestId('source-control-push-modal-branch-select')).toBeInTheDocument();
	expect(queryByTestId('source-control-push-modal-branch-new')).not.toBeInTheDocument();

	await userEvent.click(getByTestId('source-control-push-modal-branch-new-toggle'));
	expect(getByTestId('source-control-push-modal-branch-new')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (inside `packages/frontend/editor-ui`): `pnpm test SourceControlPushModal`
Expected: FAIL — branch testids don't exist yet.

- [ ] **Step 4: Add branch state + fetch to the script**

In `SourceControlPushModal.vue` `<script setup>`, add imports and state (near `const commitMessage = ref('');`, line ~469):

```typescript
import { isValidGitBranchName } from '@n8n/api-types';

const isCreatingBranch = ref(false);
const selectedBranch = ref('');
const newBranchName = ref('');

const branchOptions = computed(() =>
	sourceControlStore.preferences.branches.map((b) => ({ label: b, value: b })),
);
const defaultBranch = computed(() => sourceControlStore.preferences.branchName);

const isBranchValid = computed(() =>
	isCreatingBranch.value
		? isValidGitBranchName(newBranchName.value.trim())
		: selectedBranch.value.length > 0,
);
```

- [ ] **Step 5: Fetch branches on mount and default the selection**

In the existing `onMounted` (line ~887), after `await loadSourceControlStatus();`, add:

```typescript
	try {
		await sourceControlStore.getBranches();
	} catch (error) {
		// non-fatal: fall back to the default branch already in preferences
	}
	selectedBranch.value = sourceControlStore.preferences.branchName;
```

- [ ] **Step 6: Fold `isBranchValid` into submit-disabled**

Find `isSubmitDisabled` (the `:disabled` binding on the submit button uses it) and add `|| !isBranchValid.value` to its computed definition. If `isSubmitDisabled` is a computed, edit its return expression; e.g.:

```typescript
const isSubmitDisabled = computed(
	() => selectedCount.value === 0 || !isBranchValid.value,
);
```

(Preserve any existing conditions in that computed — append `|| !isBranchValid.value`.)

- [ ] **Step 7: Pass branch into commitAndPush**

Update the `pushWorkfolder` call in `commitAndPush` (lines ~611-615):

```typescript
		await sourceControlStore.pushWorkfolder({
			force: true,
			commitMessage: commitMessage.value,
			fileNames: files,
			branch: isCreatingBranch.value ? newBranchName.value.trim() : selectedBranch.value,
			createBranch: isCreatingBranch.value,
		});
```

- [ ] **Step 8: Add the branch UI to the footer template**

In the footer (`<template #footer>`, before the `commitMessage` `<N8nText bold tag="p">` block at line ~1280), insert:

```vue
			<div :class="$style.branchRow">
				<N8nSelect
					v-if="!isCreatingBranch"
					v-model="selectedBranch"
					data-test-id="source-control-push-modal-branch-select"
					:placeholder="i18n.baseText('settings.sourceControl.modals.push.branch')"
					filterable
					teleported="false"
				>
					<N8nOption
						v-for="option in branchOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</N8nSelect>
				<N8nInput
					v-else
					v-model="newBranchName"
					data-test-id="source-control-push-modal-branch-new"
					:placeholder="
						i18n.baseText('settings.sourceControl.modals.push.branch.newBranchPlaceholder')
					"
				/>
				<N8nCheckbox
					v-model="isCreatingBranch"
					data-test-id="source-control-push-modal-branch-new-toggle"
					:label="i18n.baseText('settings.sourceControl.modals.push.branch.newBranch')"
				/>
			</div>
			<N8nText v-if="isCreatingBranch" size="small" color="text-light">
				{{ i18n.baseText('settings.sourceControl.modals.push.branch.base', { interpolate: { branch: defaultBranch } }) }}
			</N8nText>
```

Ensure `N8nOption` and `N8nCheckbox` are added to the `@n8n/design-system` import block (lines ~55-64) if not already imported. Add a `.branchRow` style in the `<style module>` block:

```scss
.branchRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	margin-bottom: var(--spacing-2xs);
}
```

- [ ] **Step 9: Run modal test to verify it passes**

Run: `pnpm test SourceControlPushModal`
Expected: PASS.

- [ ] **Step 10: Lint, typecheck, commit**

Run (inside `packages/frontend/editor-ui`): `pnpm lint && pnpm typecheck`

```bash
git add packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue \
  packages/frontend/@n8n/i18n/src/locales/en.json \
  packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/__tests__/
git commit -m "feat(source-control): add branch picker to commit modal"
```

---

### Task 7: Relabel Admin Settings branch as "Default branch"

**Files:**
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json`
- Modify: `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/views/SettingsSourceControl.vue`

**Interfaces:**
- No API change; UI copy only.

- [ ] **Step 1: Update the i18n string**

In `packages/frontend/@n8n/i18n/src/locales/en.json`, change line ~3770:

```json
	"settings.sourceControl.branches": "Default branch",
```

- [ ] **Step 2: Add a helper caption string (optional clarity)**

Add near it:

```json
	"settings.sourceControl.branches.caption": "Used for pull. Choose or create the branch for each commit in the push dialog.",
```

- [ ] **Step 3: Reference the caption under the branch select in the settings view**

In `SettingsSourceControl.vue`, under the branch `<N8nFormInput>` (around line ~489), add:

```vue
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.sourceControl.branches.caption') }}
				</N8nText>
```

- [ ] **Step 4: Verify the settings view renders (lint + typecheck)**

Run (inside `packages/frontend/editor-ui`): `pnpm lint && pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/@n8n/i18n/src/locales/en.json \
  packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/views/SettingsSourceControl.vue
git commit -m "feat(source-control): relabel fixed branch as default branch"
```

---

## Final Verification

- [ ] Build affected packages: from repo root `pnpm build > build.log 2>&1`, then `tail -n 20 build.log` — no errors (api-types is consumed by cli + editor-ui, so build before final lint/typecheck).
- [ ] Backend: inside `packages/cli`, `pnpm test src/modules/source-control.ee` → PASS.
- [ ] api-types: inside `packages/@n8n/api-types`, `pnpm test src/dto/source-control src/utils` → PASS.
- [ ] Frontend: inside `packages/frontend/editor-ui`, `pnpm test SourceControlPushModal sourceControl.store` → PASS.
- [ ] Repo-wide `pnpm lint` and `pnpm typecheck` clean.
- [ ] Manual smoke (optional, via `pnpm dev` against service containers): connect a repo, open the commit modal, pick an existing branch and push; toggle "New branch", enter `feat/smoke`, push, and confirm the branch appears on the remote; pull and confirm it targets the default branch.

## Self-Review Notes

- **Spec coverage:** default-branch relabel (Task 7), per-commit branch select (Task 6), new-branch creation off default (Tasks 2–3, 6), pull-always-default (Task 4), DTO + validation (Task 1), read-only flag untouched (no task — intentionally unchanged). All spec sections covered.
- **Type consistency:** `createBranchFrom(newBranch, baseBranch)`, `checkoutExistingBranch(branch)`, `push({ force, branch, setUpstream })`, `prepareBranchForPush → { targetBranch, isNewBranch, defaultBranch }`, store `pushWorkfolder({ ..., branch?, createBranch? })` — names consistent across Tasks 2/3/5/6.
- **Test-setup caveat:** the exact mock style (Vitest `vi` vs jest) and render helpers must match each package's existing tests; steps note this where it matters.
