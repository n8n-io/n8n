# Instance Admin Cross-Project Execution Quotas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an instance admin a central view (on the existing Security Settings page) of every project's execution quota and consumption, with the ability to edit any project's quota from there — the second admin journey called for in the spec addendum, alongside the existing project-admin journey.

**Architecture:** One new global-scope grant makes the existing per-project `PATCH /projects/:projectId/execution-quota` endpoint (built in the original PoC) callable by any global owner/admin against any project — no new write endpoint. One new read endpoint lists every project with its resolved quota and consumption in one response. The frontend adds a table + edit modal to the existing `SecuritySettings.vue` page, which is already gated to global owner/admin — no new route needed.

**Tech Stack:** Same as the original PoC — TypeORM, `@n8n/decorators` REST controllers, Vue 3 + `@n8n/design-system`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-project-execution-limits-design.md`, "Instance Admin: Cross-Project View (Addendum)" section.

## Global Constraints

- Every global owner and admin gets this capability (not narrowed to owner-only) — spec decision.
- Editing reuses the existing `PATCH /projects/:projectId/execution-quota` endpoint verbatim. No new write endpoint.
- No new route: the new UI lives inside the existing `/settings/security` page, already gated by the `securitySettings:manage` global scope.
- No aggregate SQL query for consumption — a per-project loop via `Promise.all` is the correct shape at PoC/realistic self-hosted scale.

---

### Task 1: Grant the scope globally and add the all-projects consumption service method

**Files:**
- Modify: `packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts:118` (insert after)
- Modify: `packages/cli/src/execution-quota/project-execution-quota.service.ts`
- Test: `packages/cli/src/execution-quota/__tests__/project-execution-quota.service.test.ts` (extend)

**Interfaces:**
- Produces: `ProjectExecutionQuotaService.getAllProjectsConsumption(): Promise<Array<{ projectId: string; projectName: string; limit: number; periodUnit: ExecutionQuotaPeriodUnit; consumed: number; remaining: number | null; resetsAt: string }>>` — consumed by Task 2's controller endpoint.

- [ ] **Step 1: Grant the scope globally**

In `packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts`, in the `GLOBAL_OWNER_SCOPES` array, insert immediately after line 118 (`'project:manageMembers',`) and before line 119 (`'insights:list',`):

```ts
	'project:manageExecutionQuota',
```

`GLOBAL_ADMIN_SCOPES = GLOBAL_OWNER_SCOPES.concat()` (line 179) picks this up automatically — no separate edit needed there.

- [ ] **Step 2: Verify it compiles and check the scope-snapshot test**

Run: `cd packages/@n8n/permissions && npx vitest run` (this package's suite is small; a full run is fine here, no need to scope to one file). If a snapshot test fails on the scope list (e.g. `scope-information.test.ts.snap`, referenced in this branch's earlier history), update it with `-u` and review the diff shows only the one new scope, nothing else changed.

- [ ] **Step 3: Write the failing test for `getAllProjectsConsumption`**

Add to `packages/cli/src/execution-quota/__tests__/project-execution-quota.service.test.ts`:

```ts
describe('ProjectExecutionQuotaService.getAllProjectsConsumption', () => {
	it('returns one row per project with its resolved quota and consumption', async () => {
		const projectRepository = mock<ProjectRepository>();
		const quotaRepository = mock<ProjectExecutionQuotaRepository>();
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const license = mock<License>();

		projectRepository.find.mockResolvedValue([
			{ id: 'project-1', name: 'Marketing' } as Project,
			{ id: 'project-2', name: 'Engineering' } as Project,
		]);
		quotaRepository.findOneBy.mockImplementation(async ({ projectId }: never) =>
			projectId === 'project-1'
				? ({ projectId: 'project-1', limit: 10, periodUnit: 'day' } as never)
				: null,
		);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(3);
		license.getValue.mockReturnValue(undefined);
		license.getPlanName.mockReturnValue('Community');

		const service = new ProjectExecutionQuotaService(
			mock(),
			quotaRepository,
			counterRepository,
			license,
			mock(),
			projectRepository,
		);

		const rows = await service.getAllProjectsConsumption();

		expect(rows).toHaveLength(2);
		expect(rows).toContainEqual(
			expect.objectContaining({ projectId: 'project-1', projectName: 'Marketing', limit: 10, periodUnit: 'day', consumed: 3 }),
		);
		expect(rows).toContainEqual(
			expect.objectContaining({ projectId: 'project-2', projectName: 'Engineering' }),
		);
	});
});
```

Add `import type { Project, ProjectRepository } from '@n8n/db';` to the test file's imports if not already present (it likely isn't — this is the first test in this file to use `ProjectRepository`).

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd packages/cli && npx vitest run src/execution-quota/__tests__/project-execution-quota.service.test.ts`
Expected: FAIL — either a constructor-arity error (6 deps expected, 5 provided) or "getAllProjectsConsumption is not a function".

- [ ] **Step 5: Add `ProjectRepository` as a 6th constructor dependency and implement the method**

In `packages/cli/src/execution-quota/project-execution-quota.service.ts`, add the import and constructor parameter:

```ts
import { ProjectExecutionCounterRepository, ProjectExecutionQuotaRepository, ProjectRepository, SharedWorkflowRepository } from '@n8n/db';
```

```ts
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly quotaRepository: ProjectExecutionQuotaRepository,
		private readonly counterRepository: ProjectExecutionCounterRepository,
		private readonly license: License,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly projectRepository: ProjectRepository,
	) {}
```

Add the method, reusing `getConsumption` per project so the resolution logic (override → license → tier, `resetsAt` computation) isn't duplicated:

```ts
	/**
	 * Every project in the instance with its resolved quota and current
	 * consumption — the data source for the instance-admin cross-project
	 * view. A loop over `getConsumption` is the right shape at realistic
	 * self-hosted instance scale (see spec addendum); a single aggregate
	 * query is a later optimization, not required here.
	 */
	async getAllProjectsConsumption() {
		const projects = await this.projectRepository.find();

		return await Promise.all(
			projects.map(async (project) => ({
				projectId: project.id,
				projectName: project.name,
				...(await this.getConsumption(project.id)),
			})),
		);
	}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/cli && npx vitest run src/execution-quota/__tests__/project-execution-quota.service.test.ts`
Expected: PASS, all tests in the file (including the pre-existing ones, now constructed with 6 args if any other test in this file directly constructs the service — check and update those too).

- [ ] **Step 7: Repo-wide, test-inclusive grep for other `new ProjectExecutionQuotaService(` call sites**

Run: `grep -rn "new ProjectExecutionQuotaService(" packages --include="*.ts"`. Update any site still passing 5 args to pass a 6th mocked `ProjectRepository`. (Two earlier tasks in this codebase's history shipped defects specifically from skipping this exact check.)

- [ ] **Step 8: Commit**

```bash
git add packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts packages/cli/src/execution-quota/
git commit -m "feat(execution-quota): grant quota-management scope globally, add all-projects consumption"
```

---

### Task 2: Add the `GET /projects/execution-quota` admin-listing endpoint

**Files:**
- Modify: `packages/cli/src/controllers/project.controller.ts`
- Test: find the existing controller test for `ProjectController` (e.g. `packages/cli/src/controllers/__tests__/project.controller.test.ts` — check it exists first; if it doesn't, check how the existing `getExecutionQuota`/`updateExecutionQuota`/`getExecutionQuotaSpikes` endpoints added in the original PoC were tested, and follow that same pattern, whatever it turns out to be — a controller unit test, an integration test, or scope-decorator assertions only)

**Interfaces:**
- Consumes: `ProjectExecutionQuotaService.getAllProjectsConsumption()` (Task 1).
- Produces: `GET /projects/execution-quota` → `Array<{ projectId, projectName, limit, periodUnit, consumed, remaining, resetsAt }>`.

- [ ] **Step 1: Check how the original PoC's execution-quota endpoints were tested**

Before writing a new test, run `grep -rln "getExecutionQuota\b" packages/cli/src/controllers/__tests__/ packages/cli/test/ 2>/dev/null` to find any existing test coverage for the sibling endpoints this task's endpoint sits next to. Follow whatever pattern you find. If none exists (the original PoC may only have covered these via the service-level tests and the controller unit tests dispatched separately during that PoC's own build), note that in your report rather than inventing a new controller-testing convention from scratch — a scope-decorator assertion (confirming the route is registered with `@GlobalScope('project:manageExecutionQuota')`, `globalOnly: true`) is the minimum bar if no fuller controller test convention exists.

- [ ] **Step 2: Add the endpoint**

In `packages/cli/src/controllers/project.controller.ts`, add near the existing three execution-quota endpoints (after `getExecutionQuotaSpikes`, around line 306):

```ts
	@Get('/execution-quota')
	@GlobalScope('project:manageExecutionQuota')
	async getAllProjectsExecutionQuota(_req: AuthenticatedRequest, _res: Response) {
		return await this.projectExecutionQuotaService.getAllProjectsConsumption();
	}
```

Add `GlobalScope` to the existing `@n8n/decorators` import at the top of the file if it isn't already imported (check first — `ProjectController` may already import other decorators from that module).

Note the route path is `/projects/execution-quota` (one segment after `/projects`), which does not collide with `/projects/:projectId/execution-quota` (two segments) — no routing ambiguity, declaration order doesn't matter here, but keep it grouped with the other execution-quota endpoints for readability.

- [ ] **Step 3: Verify and test per whatever convention Step 1 found**

Write the test (or scope-decorator assertion) matching the established pattern, run it, confirm real pass output.

- [ ] **Step 4: Manual verification against the running local demo instance**

A local instance should already be running at `http://localhost:5998` (owner account + seeded projects from the original PoC's demo). Log in as the owner and call:

```bash
curl -s -b /tmp/n8n-poc-execlimits-cookies.txt http://localhost:5998/rest/projects/execution-quota | python3 -m json.tool
```

If the cookie jar is stale, re-authenticate first (check the demo script at `.superpowers/sdd/2026-09-01-project-execution-limits-poc/demo-walkthrough.mjs` for the exact login curl pattern it uses). Confirm the response includes every seeded project with its quota/consumption.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/controllers/project.controller.ts packages/cli/src/controllers/__tests__/
git commit -m "feat(execution-quota): add instance-admin GET /projects/execution-quota endpoint"
```

---

### Task 3: Frontend API client for the admin listing endpoint

**Files:**
- Create: `packages/frontend/@n8n/rest-api-client/src/api/execution-quotas.ts`
- Modify: `packages/frontend/@n8n/rest-api-client/src/api/index.ts` (barrel export)
- Modify: `packages/frontend/editor-ui/src/features/collaboration/projects/projects.types.ts` (or wherever `ProjectExecutionQuota`-shaped types currently live from the original PoC — find it first)

**Interfaces:**
- Consumes: `GET /projects/execution-quota` (Task 2).
- Produces: `getAllProjectsExecutionQuota(context: IRestApiContext): Promise<ProjectExecutionQuotaRow[]>` — consumed by Task 4's table component.

- [ ] **Step 1: Find the existing per-project quota type**

Run `grep -rn "interface.*ExecutionQuota\|type.*ExecutionQuota" packages/frontend/editor-ui/src/features/collaboration/projects/projects.types.ts` to find the exact shape already defined for the per-project `getExecutionQuota` response from the original PoC. Reuse or extend it rather than defining a parallel, slightly-different type.

- [ ] **Step 2: Add the new type**

Add an exported type in the same file, extending the existing per-project quota shape with `projectId`/`projectName`:

```ts
export interface ProjectExecutionQuotaRow extends ProjectExecutionQuota {
	projectId: string;
	projectName: string;
}
```

(Adjust the exact base type name to match whatever Step 1 found — the field names above, `limit`/`periodUnit`/`consumed`/`remaining`/`resetsAt`, must match the backend response from Task 2 exactly.)

- [ ] **Step 3: Create the API client module**

Create `packages/frontend/@n8n/rest-api-client/src/api/execution-quotas.ts`, following the exact pattern in the sibling `security-settings.ts` file in the same directory (flat exported async functions, `context: IRestApiContext` first parameter, `makeRestApiRequest`):

```ts
import type { ProjectExecutionQuotaRow } from '../types';
import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getAllProjectsExecutionQuota(
	context: IRestApiContext,
): Promise<ProjectExecutionQuotaRow[]> {
	return await makeRestApiRequest(context, 'GET', '/projects/execution-quota');
}
```

If `ProjectExecutionQuotaRow` doesn't naturally belong in `../types` (this package's own types file) because it's actually defined in `editor-ui`'s `projects.types.ts` per Step 1/2, adjust the import path accordingly or inline the return type as the shape directly — check how other `api/*.ts` files in this same rest-api-client package that return editor-ui-specific shapes handle this (they may just inline an object-literal type rather than importing across package boundaries).

- [ ] **Step 4: Register the barrel export**

In `packages/frontend/@n8n/rest-api-client/src/api/index.ts`, add (matching the existing `security-settings` line):

```ts
export * from './execution-quotas';
```

- [ ] **Step 5: Verify it compiles**

Run: `cd packages/frontend/@n8n/rest-api-client && npx vue-tsc --noEmit` (or whatever this package's real typecheck script is — check `package.json`; it may be plain `tsc` since this package might not contain `.vue` files). Confirm clean.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/@n8n/rest-api-client/src/api/ packages/frontend/editor-ui/src/features/collaboration/projects/projects.types.ts
git commit -m "feat(execution-quota): add frontend API client for the admin quota listing"
```

---

### Task 4: Frontend table and edit modal

**Files:**
- Create: `packages/frontend/editor-ui/src/features/settings/security/ExecutionQuotaTable.vue`
- Create: `packages/frontend/editor-ui/src/features/settings/security/ExecutionQuotaEditModal.vue`
- Test: `packages/frontend/editor-ui/src/features/settings/security/__tests__/ExecutionQuotaTable.test.ts` (or wherever this directory's existing tests live — check for a sibling `__tests__` dir first)

**Interfaces:**
- Consumes: `getAllProjectsExecutionQuota(context)` (Task 3), the existing `updateExecutionQuota(projectId, payload)` store method from `projects.store.ts` (built in the original PoC's Task 8 — reuse this directly for the edit modal's save action, do not add a new store method).

- [ ] **Step 1: Read the real patterns first**

Before writing, read in full: `packages/frontend/editor-ui/src/features/settings/apiKeys/components/ApiKeyTable.vue` (the table pattern — `N8nDataTableServer` or check if a simpler client-side `N8nDataTable` exists and fits better, since this endpoint returns everything in one response rather than being genuinely server-paginated) and `packages/frontend/editor-ui/src/features/settings/apiKeys/components/ApiKeyCreateOrEditModal.vue` (the modal-based edit pattern — row click/action emits an event, a separate modal component owns the actual form and save call, opened via `useUIStore()`).

- [ ] **Step 2: Build the table component**

Create `packages/frontend/editor-ui/src/features/settings/security/ExecutionQuotaTable.vue`, modeled directly on `ApiKeyTable.vue`'s structure: columns for project name, limit, period, consumed/remaining, and an actions column with an "Edit" action that emits `edit` with the row's data (following the exact same emit-based pattern `ApiKeyTable.vue` uses — do not build inline cell editing, it's not this codebase's convention for admin tables). Fetch the data via `getAllProjectsExecutionQuota` from the API client built in Task 3, called through `@n8n/rest-api-client` directly (following whatever pattern `security-settings.ts`'s consumer, `SecuritySettings.vue`, uses to call its own API module — likely `useRootStore().restApiContext` passed as the context argument).

- [ ] **Step 3: Build the edit modal**

Create `packages/frontend/editor-ui/src/features/settings/security/ExecutionQuotaEditModal.vue`, modeled on `ApiKeyCreateOrEditModal.vue`'s structure (wraps `Modal` from `@/app/components/Modal.vue`, opened via a UI-store modal key, owns its own form state for `limit`/`periodUnit`). On save, call `useProjectsStore().updateExecutionQuota(projectId, { limit, periodUnit })` — the exact store method built in the original PoC's Task 8, reused as-is, not reimplemented. On success, close the modal and emit an event so the parent table can refetch or optimistically update its row.

- [ ] **Step 4: Write a test for the table**

Following whatever test convention exists for sibling components in this directory (check `packages/frontend/editor-ui/src/features/settings/apiKeys/components/__tests__/` for `ApiKeyTable.test.ts` as the closest precedent if it exists), write a test asserting: the table renders one row per project from a mocked API response, and clicking a row's edit action emits/opens the edit flow.

- [ ] **Step 5: Run the test and typecheck**

Run: `cd packages/frontend/editor-ui && npx vitest run src/features/settings/security/__tests__/ExecutionQuotaTable.test.ts` (adjust path to match where the test actually landed) and the package's real typecheck script.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/editor-ui/src/features/settings/security/
git commit -m "feat(execution-quota): add instance-admin execution quota table and edit modal"
```

---

### Task 5: Slot the new section into Security Settings

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/settings/security/SecuritySettings.vue`
- Modify: this codebase's i18n locale file (find via `grep -rn "settings.security.dataRedaction" packages/frontend/editor-ui/src/plugins/i18n/locales/en.json` or wherever `SecuritySettings.vue`'s existing i18n keys are defined, and add new keys in the same `settings.security.*` namespace)

**Interfaces:**
- Consumes: `ExecutionQuotaTable.vue` (Task 4).

- [ ] **Step 1: Add the new section to the template**

In `packages/frontend/editor-ui/src/features/settings/security/SecuritySettings.vue`, import `ExecutionQuotaTable` and add a new guarded block after the existing `WorkflowReviewsSection` block (after its closing `</template>`, matching that block's header-div + content-div structure — a `N8nHeading`/`N8nText` pair in a `$style.headerTitle` div, followed by the table in a `$style.settingsSection` div). This section does not need a licensing gate (unlike `WorkflowReviewsSection`, which checks `isWorkflowReviewsAvailable`) — it should always render for anyone who can reach this page, since reaching `/settings/security` at all already requires the global scope granted in Task 1.

- [ ] **Step 2: Add i18n keys**

Add keys for the new section's heading/description text in the same locale file and namespace as the existing `settings.security.*` keys (e.g. `settings.security.executionQuota.title`, `settings.security.executionQuota.description`), following the exact key-naming convention already used for `settings.security.dataRedaction.*`.

- [ ] **Step 3: Verify — no fabricated browser testing**

As with the original PoC's frontend tasks, you do not have browser access as a subagent. Verify via the real typecheck/lint scripts for `packages/frontend/editor-ui`, and re-run the tests from Task 4. Do not claim interactive verification you didn't perform — note in your report that a manual check against the running local instance (`http://localhost:5998/settings/security`) is a follow-up step for the controller, not something you can do yourself.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/settings/security/SecuritySettings.vue packages/frontend/editor-ui/src/plugins/i18n/locales/en.json
git commit -m "feat(execution-quota): slot execution quota admin section into Security Settings"
```

---

## Self-Review Notes

- **Spec coverage:** the addendum's four pieces (global scope grant, one new read endpoint, reuse of the existing write endpoint, frontend section on the existing Security Settings page) map to Tasks 1, 2, (no task — reuse is automatic once Task 1's scope grant lands), and 3-5 respectively.
- **Type consistency:** `ProjectExecutionQuotaRow` (Task 3) must have field names matching exactly what Task 1's `getAllProjectsConsumption()` returns (`projectId`, `projectName`, `limit`, `periodUnit`, `consumed`, `remaining`, `resetsAt`) — Task 3 Step 1 explicitly directs finding and reusing the real existing per-project type rather than inventing a parallel one.
- **Known research gaps flagged inline, not guessed:** Task 2 Step 1 (existing controller test convention, if any) and Task 4 Step 1 (exact table-component choice — server vs. client-side data table) both point the implementer at a concrete file-finding action rather than assuming an answer.
