# Project Execution Limits (PoC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working PoC of project-level execution quotas in n8n — an instance admin sets a per-project execution limit scoped to a period, a project member sees consumption vs. limit, executions are hard-rejected once the quota is hit, and workflows whose volume spikes far beyond their own baseline are flagged.

**Architecture:** Two new tables (`project_execution_quota`, `project_execution_counter`) back both the hard quota and the spike-guard. A new `ProjectExecutionQuotaService` resolves the effective limit (per-project override → license quota → tier default, mirroring the existing evaluation-concurrency pattern) and gates `ActiveExecutions.add()` before an execution starts. The counter reuses Insights' own mode-inclusion rule (`shouldSkipMode`) so the two systems count the same thing wherever status doesn't diverge. New REST endpoints and two new Vue components (a settings section, a consumption card) expose it.

**Tech Stack:** TypeORM (`@n8n/typeorm`), the n8n schema-builder migration DSL, `@n8n/decorators` REST controllers, Vue 3 + `@n8n/design-system`, Vitest for unit/integration tests, Playwright for the demo script.

**Spec:** `docs/superpowers/specs/2026-09-01-project-execution-limits-design.md`

## Global Constraints

- No queueing, no soft-then-hard grace buffer: a project over quota rejects new executions immediately (spec: Enforcement).
- The spike-guard is flag-only — it never gates `ActiveExecutions.add()` (spec: Spike-Guard).
- The execution_counter increment applies the same `shouldSkipMode()` rule as `insights-collection.service.ts` so quota counts share Insights' mode-inclusion definition; the status-based gap (canceled executions) is documented, not solved, in this PoC (spec: Consistency with Insights).
- Worker-level limits, instance-level limits, ML anomaly detection, billing/overage, and an admin-configurable spike multiplier are explicitly out of scope (spec: Non-Goals).
- This is a PoC branch (`poc-project-execution-limits`), framed as a draft PR not to merge as-is — same framing as `poc-workflow-tests` (PR n8n#37093).

---

### Task 1: License quota constant + resolver for the default project execution limit

**Files:**
- Modify: `packages/@n8n/constants/src/index.ts` (add to `LICENSE_QUOTAS`)
- Modify: `packages/@n8n/backend-common/src/license-state.ts` (add typed getter)
- Create: `packages/cli/src/execution-quota/project-execution-quota.helper.ts`
- Test: `packages/cli/src/execution-quota/__tests__/project-execution-quota.helper.test.ts`

**Interfaces:**
- Produces: `resolveDefaultProjectExecutionLimit(license: License): number` — used by Task 4's `ProjectExecutionQuotaService.resolveLimit()`.

- [ ] **Step 1: Add the license quota key**

In `packages/@n8n/constants/src/index.ts`, inside the existing `LICENSE_QUOTAS` object (currently ending with `EVALUATION_CONCURRENCY_LIMIT: 'quota:evaluations:concurrencyLimit',`), add:

```ts
	PROJECT_EXECUTION_LIMIT: 'quota:project:executionLimit',
```

- [ ] **Step 2: Add the `LicenseState` getter**

In `packages/@n8n/backend-common/src/license-state.ts`, add a new method to the `LicenseState` class, next to `getEvaluationConcurrencyQuota()`:

```ts
	/**
	 * Effective default per-project execution limit issued by the license
	 * server. `undefined` when the license has no opinion, so callers can
	 * fall through to a tier default — same convention as
	 * `getEvaluationConcurrencyQuota()`.
	 */
	getProjectExecutionLimitQuota(): number | undefined {
		return this.getValue('quota:project:executionLimit');
	}
```

- [ ] **Step 3: Write the failing test for the resolver**

Create `packages/cli/src/execution-quota/__tests__/project-execution-quota.helper.test.ts`. This codebase runs tests on vitest, not jest — use `vi.fn()`, not `jest.fn()` (see `packages/cli/src/evaluation.ee/__tests__/evaluation-concurrency.helper.test.ts` for the exact house pattern this mirrors):

```ts
import type { License } from '@/license';

import {
	resolveDefaultProjectExecutionLimit,
	PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS,
} from '../project-execution-quota.helper';

const ENV_VAR = 'N8N_PROJECT_EXECUTION_LIMIT_DEFAULT';

function mockLicense(overrides: { quota?: number; planName?: string } = {}): License {
	return {
		getValue: vi.fn().mockReturnValue(overrides.quota),
		getPlanName: vi.fn().mockReturnValue(overrides.planName ?? 'Community'),
	} as unknown as License;
}

describe('resolveDefaultProjectExecutionLimit', () => {
	const originalEnv = process.env[ENV_VAR];

	afterEach(() => {
		if (originalEnv === undefined) delete process.env[ENV_VAR];
		else process.env[ENV_VAR] = originalEnv;
	});

	it('returns the env var value when set, ignoring license and tier', () => {
		process.env[ENV_VAR] = '42';
		const license = mockLicense({ quota: 999, planName: 'Enterprise' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(42);
	});

	it('returns the license quota when set and env var is unset', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: 500 });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(500);
	});

	it('ignores a license quota of 0 and falls through to tier default', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: 0, planName: 'Business' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(
			PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Business,
		);
	});

	it('falls back to the tier default when license has no opinion', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: undefined, planName: 'Enterprise' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(
			PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Enterprise,
		);
	});

	it('defaults unknown plan names to 1000', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: undefined, planName: 'SomeFuturePlan' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(1000);
	});
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter=n8n test -- project-execution-quota.helper.test.ts`
Expected: FAIL with "Cannot find module '../project-execution-quota.helper'"

- [ ] **Step 5: Write the resolver**

Create `packages/cli/src/execution-quota/project-execution-quota.helper.ts`:

```ts
import type { License } from '@/license';

/**
 * Tier defaults applied when neither the env override nor the license quota
 * are set. Enterprise defaults to unlimited (-1) because the intended
 * control surface for Enterprise customers is the per-project override in
 * `project_execution_quota`, not an instance-wide default.
 */
export const PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS = {
	Community: 1000,
	Pro: 10000,
	Business: 100000,
	Enterprise: -1,
} as const;

const PROJECT_EXECUTION_LIMIT_ENV_VAR = 'N8N_PROJECT_EXECUTION_LIMIT_DEFAULT';
const PROJECT_EXECUTION_LIMIT_QUOTA = 'quota:project:executionLimit';

const isPlanTier = (name: string): name is keyof typeof PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS =>
	name in PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS;

function readLicenseQuota(license: License): number | undefined {
	const raw = license.getValue(PROJECT_EXECUTION_LIMIT_QUOTA);
	if (typeof raw !== 'number') return undefined;
	if (raw === 0) return undefined;
	return raw;
}

/**
 * Resolve the default per-project execution limit for this instance, used
 * when a project has no explicit `project_execution_quota` row of its own.
 *
 * Order of precedence, mirroring `resolveEvaluationConcurrencyLimit`:
 * 1. `N8N_PROJECT_EXECUTION_LIMIT_DEFAULT` env var (operator escape hatch)
 * 2. `quota:project:executionLimit` license entitlement
 * 3. License-tier default
 */
export function resolveDefaultProjectExecutionLimit(license: License): number {
	if (process.env[PROJECT_EXECUTION_LIMIT_ENV_VAR] !== undefined) {
		return Number(process.env[PROJECT_EXECUTION_LIMIT_ENV_VAR]);
	}

	const fromLicense = readLicenseQuota(license);
	if (fromLicense !== undefined) return fromLicense;

	const planName = license.getPlanName();
	return isPlanTier(planName) ? PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS[planName] : 1000;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter=n8n test -- project-execution-quota.helper.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/@n8n/constants/src/index.ts packages/@n8n/backend-common/src/license-state.ts packages/cli/src/execution-quota/
git commit -m "feat(execution-quota): add license quota and default-limit resolver"
```

---

### Task 2: Export `shouldSkipMode` from Insights so the quota counter reuses it

**Files:**
- Modify: `packages/cli/src/modules/insights/insights-collection.service.ts`

**Interfaces:**
- Produces: `export const shouldSkipMode: Record<WorkflowExecuteMode, boolean>` — consumed by Task 4's `ProjectExecutionQuotaService`.

**Why this task exists:** the spec requires the quota's execution counter to use the *same* mode-inclusion rule Insights uses, not a re-typed copy that can drift. `shouldSkipMode` is currently a module-private `const` in `insights-collection.service.ts`.

- [ ] **Step 1: Export the constant**

In `packages/cli/src/modules/insights/insights-collection.service.ts`, change:

```ts
const shouldSkipMode: Record<WorkflowExecuteMode, boolean> = {
```

to:

```ts
export const shouldSkipMode: Record<WorkflowExecuteMode, boolean> = {
```

Leave `shouldSkipStatus` as module-private — it's status-based and the quota gate (Task 4) fires before status is known, so it never uses it.

- [ ] **Step 2: Verify nothing else broke**

Run: `pnpm --filter=n8n test -- insights-collection.service`
Expected: PASS, same test count as before this change (exporting a const doesn't change behavior)

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/modules/insights/insights-collection.service.ts
git commit -m "refactor(insights): export shouldSkipMode for reuse by execution-quota"
```

---

### Task 3: DB migration and entities for the two new tables

**Files:**
- Create: `packages/@n8n/db/src/entities/project-execution-quota.ts`
- Create: `packages/@n8n/db/src/entities/project-execution-counter.ts`
- Modify: `packages/@n8n/db/src/entities/index.ts` (register both)
- Create: `packages/@n8n/db/src/migrations/common/<timestamp>-CreateProjectExecutionQuotaTables.ts`
- Create: `packages/@n8n/db/src/repositories/project-execution-quota.repository.ts`
- Create: `packages/@n8n/db/src/repositories/project-execution-counter.repository.ts`
- Test: `packages/@n8n/db/src/repositories/__tests__/project-execution-counter.repository.test.ts`

**Interfaces:**
- Produces: `ProjectExecutionQuota` entity (`projectId`, `limit`, `periodUnit`), `ProjectExecutionCounter` entity (`id`, `projectId`, `workflowId`, `periodUnit`, `periodStart`, `count`), `ProjectExecutionQuotaRepository`, `ProjectExecutionCounterRepository` with `getProjectPeriodTotal(projectId, periodUnit, periodStart): Promise<number>` and `incrementWorkflowCount(projectId, workflowId, periodUnit, periodStart): Promise<void>` — both consumed by Task 4.

- [ ] **Step 1: Create the `ProjectExecutionQuota` entity**

Create `packages/@n8n/db/src/entities/project-execution-quota.ts`:

```ts
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

export type ExecutionQuotaPeriodUnit = 'day' | 'week' | 'month';

/**
 * One row per project that has an admin-configured execution quota. No row
 * for a project means it falls back to the license/tier default (see
 * `resolveDefaultProjectExecutionLimit`).
 */
@Entity({ name: 'project_execution_quota' })
export class ProjectExecutionQuota extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'int' })
	limit: number;

	@Column({ type: 'varchar', length: 10 })
	periodUnit: ExecutionQuotaPeriodUnit;
}
```

- [ ] **Step 2: Create the `ProjectExecutionCounter` entity**

Create `packages/@n8n/db/src/entities/project-execution-counter.ts`:

```ts
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { ExecutionQuotaPeriodUnit } from './project-execution-quota';

/**
 * Live, fast-incrementing count of executions per (project, workflow, period
 * bucket). Project quota checks sum across a project's workflows for the
 * current bucket; the same rows back the spike-guard's per-workflow daily
 * counts. `periodStart` is a canonical bucket key (e.g. '2026-09-01' for a
 * day, not a timestamp) so equality comparisons are exact and DB-portable.
 */
@Entity({ name: 'project_execution_counter' })
export class ProjectExecutionCounter extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 10 })
	periodUnit: ExecutionQuotaPeriodUnit;

	@Column({ type: 'varchar', length: 32 })
	periodStart: string;

	@Column({ type: 'int', default: 0 })
	count: number;
}
```

- [ ] **Step 3: Register both entities**

In `packages/@n8n/db/src/entities/index.ts`, add import lines and add both classes to the `export { ... }` block and the `entities` const, following the exact pattern used for every other entity in that file (e.g. next to how `PollerState` is registered, if present, or any neighboring entity).

- [ ] **Step 4: Write the migration**

Create `packages/@n8n/db/src/migrations/common/<timestamp>-CreateProjectExecutionQuotaTables.ts` — replace `<timestamp>` with the current unix ms timestamp (e.g. via `date +%s000` or `node -e "console.log(Date.now())"`), and use the same value in the class name suffix:

```ts
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateProjectExecutionQuotaTables<TIMESTAMP> implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable('project_execution_quota')
			.withColumns(
				column('projectId').varchar(36).primary,
				column('limit').int.notNull,
				column('periodUnit').varchar(10).notNull,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}project_execution_quota_projectId`,
			});

		await createTable('project_execution_counter')
			.withColumns(
				column('id').int.primary.autoGenerate2.notNull,
				column('projectId').varchar(36).notNull,
				column('workflowId').varchar(36).notNull,
				column('periodUnit').varchar(10).notNull,
				column('periodStart').varchar(32).notNull,
				column('count').int.notNull.default(0),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}project_execution_counter_projectId`,
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}project_execution_counter_workflowId`,
			})
			.withIndexOn(['projectId', 'periodUnit', 'periodStart'])
			.withUniqueConstraintOn(['projectId', 'workflowId', 'periodUnit', 'periodStart']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('project_execution_counter');
		await dropTable('project_execution_quota');
	}
}
```

Rename the file to include the real timestamp, e.g. `1756742400000-CreateProjectExecutionQuotaTables.ts`, and the class to `CreateProjectExecutionQuotaTables1756742400000`.

- [ ] **Step 5: Regenerate the migration index**

Run: `pnpm --filter=@n8n/db gen:migration-index`
Expected: `packages/@n8n/db/src/migrations/postgresdb/index.ts` and `sqlite/index.ts` are regenerated to include the new migration.

- [ ] **Step 6: Verify the schema builds on both DB types**

Run: `pnpm --filter=@n8n/db build`
Expected: no TypeScript errors.

Run: `pnpm --filter=@n8n/db db:schema:check:sqlite` (from root: `pnpm db:schema:check:sqlite`)
Expected: passes, confirming the new tables apply cleanly to a fresh SQLite schema.

- [ ] **Step 7: Create the quota repository**

Create `packages/@n8n/db/src/repositories/project-execution-quota.repository.ts`:

```ts
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectExecutionQuota } from '../entities/project-execution-quota';

@Service()
export class ProjectExecutionQuotaRepository extends Repository<ProjectExecutionQuota> {
	constructor(dataSource: DataSource) {
		super(ProjectExecutionQuota, dataSource.manager);
	}
}
```

- [ ] **Step 8: Write the failing test for the counter repository**

Create `packages/@n8n/db/src/repositories/__tests__/project-execution-counter.repository.test.ts`:

```ts
import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { ProjectExecutionCounterRepository } from '../project-execution-counter.repository';

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['ProjectExecutionCounter', 'WorkflowEntity', 'Project']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('ProjectExecutionCounterRepository', () => {
	test('incrementWorkflowCount creates a row on first call, increments on repeat calls', async () => {
		const repository = Container.get(ProjectExecutionCounterRepository);
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await repository.incrementWorkflowCount(project.id, workflow.id, 'day', '2026-09-01');
		await repository.incrementWorkflowCount(project.id, workflow.id, 'day', '2026-09-01');
		await repository.incrementWorkflowCount(project.id, workflow.id, 'day', '2026-09-01');

		const total = await repository.getProjectPeriodTotal(project.id, 'day', '2026-09-01');
		expect(total).toBe(3);
	});

	test('getProjectPeriodTotal sums across multiple workflows in the same project', async () => {
		const repository = Container.get(ProjectExecutionCounterRepository);
		const project = await createTeamProject();
		const workflowA = await createWorkflow({}, project);
		const workflowB = await createWorkflow({}, project);

		await repository.incrementWorkflowCount(project.id, workflowA.id, 'day', '2026-09-01');
		await repository.incrementWorkflowCount(project.id, workflowB.id, 'day', '2026-09-01');
		await repository.incrementWorkflowCount(project.id, workflowB.id, 'day', '2026-09-01');

		const total = await repository.getProjectPeriodTotal(project.id, 'day', '2026-09-01');
		expect(total).toBe(3);
	});

	test('getProjectPeriodTotal does not count a different period bucket', async () => {
		const repository = Container.get(ProjectExecutionCounterRepository);
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await repository.incrementWorkflowCount(project.id, workflow.id, 'day', '2026-09-01');
		await repository.incrementWorkflowCount(project.id, workflow.id, 'day', '2026-09-02');

		expect(await repository.getProjectPeriodTotal(project.id, 'day', '2026-09-01')).toBe(1);
		expect(await repository.getProjectPeriodTotal(project.id, 'day', '2026-09-02')).toBe(1);
	});

	test('getWorkflowDailyCount returns 0 when no rows exist', async () => {
		const repository = Container.get(ProjectExecutionCounterRepository);
		const workflow = await createWorkflow();

		expect(await repository.getWorkflowDailyCount(workflow.id, '2026-09-01')).toBe(0);
	});
});
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `pnpm --filter=@n8n/db test -- project-execution-counter.repository.test.ts`
Expected: FAIL with "Cannot find module '../project-execution-counter.repository'"

- [ ] **Step 10: Write the counter repository**

Create `packages/@n8n/db/src/repositories/project-execution-counter.repository.ts`:

```ts
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectExecutionCounter } from '../entities/project-execution-counter';
import type { ExecutionQuotaPeriodUnit } from '../entities/project-execution-quota';

@Service()
export class ProjectExecutionCounterRepository extends Repository<ProjectExecutionCounter> {
	constructor(dataSource: DataSource) {
		super(ProjectExecutionCounter, dataSource.manager);
	}

	async getProjectPeriodTotal(
		projectId: string,
		periodUnit: ExecutionQuotaPeriodUnit,
		periodStart: string,
	): Promise<number> {
		const { total } = await this.createQueryBuilder('counter')
			.select('COALESCE(SUM(counter.count), 0)', 'total')
			.where('counter.projectId = :projectId', { projectId })
			.andWhere('counter.periodUnit = :periodUnit', { periodUnit })
			.andWhere('counter.periodStart = :periodStart', { periodStart })
			.getRawOne<{ total: string }>();

		return Number(total);
	}

	/**
	 * Race-safe upsert: the unique constraint on (projectId, workflowId,
	 * periodUnit, periodStart) means a concurrent insert from another
	 * execution starting at the same instant fails with a constraint
	 * violation here, which we treat as "someone else created the row" and
	 * retry as an increment.
	 */
	async incrementWorkflowCount(
		projectId: string,
		workflowId: string,
		periodUnit: ExecutionQuotaPeriodUnit,
		periodStart: string,
	): Promise<void> {
		const existing = await this.findOneBy({ projectId, workflowId, periodUnit, periodStart });
		if (existing) {
			await this.increment({ id: existing.id }, 'count', 1);
			return;
		}

		try {
			await this.insert({ projectId, workflowId, periodUnit, periodStart, count: 1 });
		} catch {
			await this.increment({ projectId, workflowId, periodUnit, periodStart }, 'count', 1);
		}
	}

	async getWorkflowDailyCount(workflowId: string, day: string): Promise<number> {
		const { total } = await this.createQueryBuilder('counter')
			.select('COALESCE(SUM(counter.count), 0)', 'total')
			.where('counter.workflowId = :workflowId', { workflowId })
			.andWhere("counter.periodUnit = 'day'")
			.andWhere('counter.periodStart = :day', { day })
			.getRawOne<{ total: string }>();

		return Number(total);
	}
}
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `pnpm --filter=@n8n/db test -- project-execution-counter.repository.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 12: Commit**

```bash
git add packages/@n8n/db/src/entities/project-execution-quota.ts packages/@n8n/db/src/entities/project-execution-counter.ts packages/@n8n/db/src/entities/index.ts packages/@n8n/db/src/migrations/ packages/@n8n/db/src/repositories/project-execution-quota.repository.ts packages/@n8n/db/src/repositories/project-execution-counter.repository.ts
git commit -m "feat(db): add project execution quota and counter tables"
```

---

### Task 4: Period bucket helper and `ProjectExecutionQuotaService`

**Files:**
- Create: `packages/cli/src/execution-quota/period-bucket.ts`
- Create: `packages/cli/src/execution-quota/project-execution-quota.error.ts`
- Create: `packages/cli/src/execution-quota/project-execution-quota.service.ts`
- Test: `packages/cli/src/execution-quota/__tests__/period-bucket.test.ts`
- Test: `packages/cli/src/execution-quota/__tests__/project-execution-quota.service.test.ts`

**Interfaces:**
- Consumes: `resolveDefaultProjectExecutionLimit(license: License): number` (Task 1), `shouldSkipMode` (Task 2), `ProjectExecutionQuotaRepository`/`ProjectExecutionCounterRepository` (Task 3), `SharedWorkflowRepository.getWorkflowOwningProject(workflowId: string): Promise<Project | undefined>` (existing).
- Produces: `computePeriodBucket(periodUnit: ExecutionQuotaPeriodUnit, date: DateTime): string`, `ProjectExecutionQuotaExceededError`, `ProjectExecutionQuotaService.assertWithinQuotaAndIncrement(workflowId: string, mode: WorkflowExecuteMode): Promise<void>` — consumed by Task 5. `ProjectExecutionQuotaService.resolveLimit(projectId): Promise<{limit: number; periodUnit: ExecutionQuotaPeriodUnit}>` and `.getConsumption(projectId)` / `.setLimit(...)` — consumed by Task 6's controller.

- [ ] **Step 1: Write the failing test for the period bucket helper**

Create `packages/cli/src/execution-quota/__tests__/period-bucket.test.ts`:

```ts
import { DateTime } from 'luxon';

import { computePeriodBucket } from '../period-bucket';

describe('computePeriodBucket', () => {
	const date = DateTime.utc(2026, 9, 1, 14, 30);

	it('buckets a day period as yyyy-MM-dd', () => {
		expect(computePeriodBucket('day', date)).toBe('2026-09-01');
	});

	it('buckets a month period as yyyy-MM', () => {
		expect(computePeriodBucket('month', date)).toBe('2026-09');
	});

	it('buckets a week period consistently for two dates in the same ISO week', () => {
		const monday = DateTime.utc(2026, 8, 31);
		const wednesday = DateTime.utc(2026, 9, 2);

		expect(computePeriodBucket('week', monday)).toBe(computePeriodBucket('week', wednesday));
	});

	it('buckets a week period differently for two dates in different ISO weeks', () => {
		const week1 = DateTime.utc(2026, 8, 31);
		const week2 = DateTime.utc(2026, 9, 7);

		expect(computePeriodBucket('week', week1)).not.toBe(computePeriodBucket('week', week2));
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter=n8n test -- period-bucket.test.ts`
Expected: FAIL with "Cannot find module '../period-bucket'"

- [ ] **Step 3: Write the period bucket helper**

Create `packages/cli/src/execution-quota/period-bucket.ts`:

```ts
import type { ExecutionQuotaPeriodUnit } from '@n8n/db';
import type { DateTime } from 'luxon';

/**
 * A canonical, sortable string key for the period bucket a timestamp falls
 * into. Used as an equality key in `project_execution_counter` rather than
 * a timestamp range comparison, so bucket membership is exact and
 * DB-portable.
 */
export function computePeriodBucket(periodUnit: ExecutionQuotaPeriodUnit, date: DateTime): string {
	switch (periodUnit) {
		case 'day':
			return date.toFormat('yyyy-MM-dd');
		case 'week':
			return date.toFormat("kkkk-'W'WW");
		case 'month':
			return date.toFormat('yyyy-MM');
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter=n8n test -- period-bucket.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the error class**

Create `packages/cli/src/execution-quota/project-execution-quota.error.ts`:

```ts
import { UserError } from 'n8n-workflow';

export class ProjectExecutionQuotaExceededError extends UserError {
	constructor(limit: number, periodUnit: string) {
		super(`This project has reached its execution quota of ${limit} per ${periodUnit}.`);
	}
}
```

- [ ] **Step 6: Write the failing test for the service**

Create `packages/cli/src/execution-quota/__tests__/project-execution-quota.service.test.ts`. This codebase runs tests on vitest, not jest — use `mock` from `vitest-mock-extended` and `vi.clearAllMocks()`, following the exact pattern in the existing `packages/cli/src/evaluation.ee/__tests__/evaluation-concurrency.helper.test.ts` (read that file first for the house style: `mock<License>({ getPlanName: vi.fn()..., getValue: vi.fn()... })`).

```ts
import type { Project, ProjectExecutionCounterRepository, ProjectExecutionQuotaRepository, SharedWorkflowRepository } from '@n8n/db';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';

import { ProjectExecutionQuotaExceededError } from '../project-execution-quota.error';
import { ProjectExecutionQuotaService } from '../project-execution-quota.service';

describe('ProjectExecutionQuotaService.assertWithinQuotaAndIncrement', () => {
	const project = { id: 'project-1' } as Project;

	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const quotaRepository = mock<ProjectExecutionQuotaRepository>();
	const counterRepository = mock<ProjectExecutionCounterRepository>();
	const license = mock<License>();

	const service = new ProjectExecutionQuotaService(
		sharedWorkflowRepository,
		quotaRepository,
		counterRepository,
		license,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(project);
	});

	it('skips the check entirely for modes Insights itself skips (e.g. manual)', async () => {
		await service.assertWithinQuotaAndIncrement('workflow-1', 'manual');

		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	it('allows and increments when under quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({ projectId: 'project-1', limit: 10, periodUnit: 'day' } as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(5);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledWith(
			'project-1',
			'workflow-1',
			'day',
			expect.any(String),
		);
	});

	it('throws and does not increment when at quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({ projectId: 'project-1', limit: 10, periodUnit: 'day' } as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(10);

		await expect(service.assertWithinQuotaAndIncrement('workflow-1', 'webhook')).rejects.toThrow(
			ProjectExecutionQuotaExceededError,
		);
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	it('throws and does not increment when over quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({ projectId: 'project-1', limit: 10, periodUnit: 'day' } as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(15);

		await expect(service.assertWithinQuotaAndIncrement('workflow-1', 'webhook')).rejects.toThrow(
			ProjectExecutionQuotaExceededError,
		);
	});

	it('allows unconditionally when the resolved limit is unlimited', async () => {
		quotaRepository.findOneBy.mockResolvedValue(null);
		license.getValue.mockReturnValue(UNLIMITED_LICENSE_QUOTA);
		license.getPlanName.mockReturnValue('Enterprise');

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.getProjectPeriodTotal).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalled();
	});

	it('does nothing when the workflow has no owning project', async () => {
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(quotaRepository.findOneBy).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm --filter=n8n test -- project-execution-quota.service.test.ts`
Expected: FAIL with "Cannot find module '../project-execution-quota.service'"

- [ ] **Step 8: Write the service**

Create `packages/cli/src/execution-quota/project-execution-quota.service.ts`:

```ts
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { ExecutionQuotaPeriodUnit } from '@n8n/db';
import { ProjectExecutionCounterRepository, ProjectExecutionQuotaRepository, SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { License } from '@/license';
import { shouldSkipMode } from '@/modules/insights/insights-collection.service';

import { computePeriodBucket } from './period-bucket';
import { ProjectExecutionQuotaExceededError } from './project-execution-quota.error';
import { resolveDefaultProjectExecutionLimit } from './project-execution-quota.helper';

@Service()
export class ProjectExecutionQuotaService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly quotaRepository: ProjectExecutionQuotaRepository,
		private readonly counterRepository: ProjectExecutionCounterRepository,
		private readonly license: License,
	) {}

	async resolveLimit(
		projectId: string,
	): Promise<{ limit: number; periodUnit: ExecutionQuotaPeriodUnit }> {
		const override = await this.quotaRepository.findOneBy({ projectId });
		if (override) return { limit: override.limit, periodUnit: override.periodUnit };

		return {
			limit: resolveDefaultProjectExecutionLimit(this.license),
			periodUnit: 'day',
		};
	}

	async setLimit(projectId: string, limit: number, periodUnit: ExecutionQuotaPeriodUnit) {
		await this.quotaRepository.upsert({ projectId, limit, periodUnit }, ['projectId']);
	}

	async getConsumption(projectId: string) {
		const { limit, periodUnit } = await this.resolveLimit(projectId);
		const periodStart = computePeriodBucket(periodUnit, DateTime.utc());
		const consumed = await this.counterRepository.getProjectPeriodTotal(
			projectId,
			periodUnit,
			periodStart,
		);

		return {
			limit,
			periodUnit,
			consumed,
			remaining: limit === UNLIMITED_LICENSE_QUOTA ? null : Math.max(limit - consumed, 0),
		};
	}

	/**
	 * Called from `ActiveExecutions.add()` before an execution is persisted.
	 * Throws `ProjectExecutionQuotaExceededError` and does not increment the
	 * counter if the project is already at or over quota. Modes Insights
	 * itself never counts (manual, agent, integrated, internal, chat) skip
	 * the check entirely, matching `shouldSkipMode` in insights-collection —
	 * see the spec's "Consistency with Insights" section for the one
	 * documented gap this does not close (status is unknown at this point).
	 */
	async assertWithinQuotaAndIncrement(workflowId: string, mode: WorkflowExecuteMode): Promise<void> {
		if (shouldSkipMode[mode]) return;

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) return;

		const { limit, periodUnit } = await this.resolveLimit(project.id);
		const periodStart = computePeriodBucket(periodUnit, DateTime.utc());

		if (limit !== UNLIMITED_LICENSE_QUOTA) {
			const consumed = await this.counterRepository.getProjectPeriodTotal(
				project.id,
				periodUnit,
				periodStart,
			);

			if (consumed >= limit) {
				throw new ProjectExecutionQuotaExceededError(limit, periodUnit);
			}
		}

		await this.counterRepository.incrementWorkflowCount(
			project.id,
			workflowId,
			periodUnit,
			periodStart,
		);
	}
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter=n8n test -- project-execution-quota.service.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 10: Commit**

```bash
git add packages/cli/src/execution-quota/
git commit -m "feat(execution-quota): add period bucket helper and quota service"
```

---

### Task 5: Wire the quota gate into `ActiveExecutions.add()`

**Files:**
- Modify: `packages/cli/src/active-executions.ts`
- Test: `packages/cli/src/__tests__/active-executions.test.ts` (extend existing suite — check whether this file already exists via `find packages/cli/src -iname "active-executions*.test.ts"`; if it exists, add to it instead of creating a new one)

**Interfaces:**
- Consumes: `ProjectExecutionQuotaService.assertWithinQuotaAndIncrement(workflowId, mode)` (Task 4).

- [ ] **Step 1: Write the failing test**

Add to (or create) `packages/cli/src/__tests__/active-executions.test.ts` a test for the new gate, following whatever mocking pattern the existing suite already uses for `ActiveExecutions`'s other constructor dependencies (`ExecutionRepository`, `ExecutionPersistence`, `ConcurrencyControlService`, `EventService`, `ExecutionsConfig`). Add `ProjectExecutionQuotaService` as a sixth mocked dependency and assert:

```ts
it('rejects a new execution when the project execution quota is exceeded', async () => {
	projectExecutionQuotaService.assertWithinQuotaAndIncrement.mockRejectedValueOnce(
		new ProjectExecutionQuotaExceededError(10, 'day'),
	);

	await expect(
		activeExecutions.add({
			executionMode: 'webhook',
			workflowData: { id: 'workflow-1' },
		} as never),
	).rejects.toThrow(ProjectExecutionQuotaExceededError);

	expect(executionPersistence.create).not.toHaveBeenCalled();
});

it('does not call the quota gate when resuming an existing execution', async () => {
	await activeExecutions.add(
		{ executionMode: 'webhook', workflowData: { id: 'workflow-1' } } as never,
		{ executionId: 'exec-1', expectedStatus: 'new' } as never,
	);

	expect(projectExecutionQuotaService.assertWithinQuotaAndIncrement).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter=n8n test -- active-executions.test.ts`
Expected: FAIL — either a constructor-arity error (six deps expected, five provided) or "quota gate never called" once the mock is wired but the production code isn't yet.

- [ ] **Step 3: Add the dependency and the gate**

In `packages/cli/src/active-executions.ts`, add the import:

```ts
import { ProjectExecutionQuotaService } from './execution-quota/project-execution-quota.service';
```

Add it to the constructor:

```ts
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly concurrencyControl: ConcurrencyControlService,
		private readonly eventService: EventService,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly projectExecutionQuotaService: ProjectExecutionQuotaService,
	) {}
```

In `add()`, inside the `if (existingExecution === undefined) {` branch, add the gate as the very first line — before `fullExecutionData` is constructed and before `capacityReservation.reserve(...)` — so a rejection has zero side effects to unwind:

```ts
			if (existingExecution === undefined) {
				await this.projectExecutionQuotaService.assertWithinQuotaAndIncrement(
					executionData.workflowData.id,
					mode,
				);

				const fullExecutionData: CreateExecutionPayload = {
```

No change to the surrounding `try`/`catch` is needed: the existing `catch (error) { capacityReservation.release(); throw error; }` wraps this whole branch, and `capacityReservation.release()` on a reservation that was never made is already a documented no-op (same guarantee the `evaluation`-mode skip in this file relies on).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter=n8n test -- active-executions.test.ts`
Expected: PASS, including the full pre-existing suite (constructor signature change must not break other tests — fix any other test in this file that constructs `ActiveExecutions` directly by adding a mocked `ProjectExecutionQuotaService`).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/active-executions.ts packages/cli/src/__tests__/active-executions.test.ts
git commit -m "feat(execution-quota): gate ActiveExecutions.add() on project execution quota"
```

---

### Task 6: Project scope, REST endpoints, and the spike-guard query

**Files:**
- Modify: `packages/@n8n/permissions/src/constants.ee.ts`
- Modify: `packages/@n8n/permissions/src/roles/scopes/project-scopes.ee.ts`
- Modify: `packages/cli/src/controllers/project.controller.ts`
- Modify: `packages/cli/src/execution-quota/project-execution-quota.service.ts` (add `getSpikes`)
- Test: `packages/cli/src/execution-quota/__tests__/project-execution-quota.service.test.ts` (extend)

**Interfaces:**
- Produces: scope `'project:manageExecutionQuota'`; `GET /projects/:projectId/execution-quota`, `PATCH /projects/:projectId/execution-quota`, `GET /projects/:projectId/execution-quota/spikes`.

- [ ] **Step 1: Add the scope**

In `packages/@n8n/permissions/src/constants.ee.ts`, change the `project` resource entry (currently `project: [...DEFAULT_OPERATIONS, 'export', 'manageMembers'] as const,`) to:

```ts
	project: [...DEFAULT_OPERATIONS, 'export', 'manageMembers', 'manageExecutionQuota'] as const,
```

In `packages/@n8n/permissions/src/roles/scopes/project-scopes.ee.ts`, add `'project:manageExecutionQuota'` to `REGULAR_PROJECT_ADMIN_SCOPES` only (not editor/viewer/personal-owner — same treatment as `'project:manageMembers'`).

- [ ] **Step 2: Verify the scope compiles**

Run: `pnpm --filter=@n8n/permissions build`
Expected: no TypeScript errors (the `Scope` union type picks up `'project:manageExecutionQuota'` automatically from step 1).

- [ ] **Step 3: Write the failing test for `getSpikes`**

Add to `packages/cli/src/execution-quota/__tests__/project-execution-quota.service.test.ts`:

```ts
describe('ProjectExecutionQuotaService.getSpikes', () => {
	it('flags a workflow whose today count exceeds 5x its trailing baseline', async () => {
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		counterRepository.findByProjectId = jest
			.fn()
			.mockResolvedValue([{ workflowId: 'workflow-1', count: 500 }]);
		insightsByPeriodRepository.getTrailingHourlyRows = jest
			.fn()
			.mockResolvedValue([{ periodStart: new Date(), value: 10 }]);

		const service = new ProjectExecutionQuotaService(
			mock(),
			mock(),
			counterRepository,
			mock(),
			insightsByPeriodRepository,
		);

		const spikes = await service.getSpikes('project-1');

		expect(spikes).toEqual([
			expect.objectContaining({ workflowId: 'workflow-1', todayCount: 500 }),
		]);
	});
});
```

This test names two methods that don't exist yet on the real repositories (`ProjectExecutionCounterRepository.findByProjectId`, `InsightsByPeriodRepository.getTrailingHourlyRows`) and a fifth constructor argument. Step 4 adds all three.

- [ ] **Step 4: Add the supporting repository methods**

In `packages/@n8n/db/src/repositories/project-execution-counter.repository.ts`, add:

```ts
	async findByProjectId(
		projectId: string,
		periodUnit: ExecutionQuotaPeriodUnit,
		periodStart: string,
	): Promise<Array<{ workflowId: string; count: number }>> {
		return await this.find({
			where: { projectId, periodUnit, periodStart },
			select: ['workflowId', 'count'],
		});
	}
```

In `packages/cli/src/modules/insights/database/repositories/insights-by-period.repository.ts`, add (following the exact join-through-metadata pattern already used by `getPreviousAndCurrentPeriodTypeAggregates`):

```ts
	/**
	 * Trailing hourly rollups for one workflow, used to build a
	 * spike-detection baseline. Day-unit rows are not usable for this: hour
	 * to day compaction only runs for data older than
	 * `compactionHourlyToDailyThresholdDays` (default 90 days), so day rows
	 * don't exist yet for recent activity.
	 */
	async getTrailingHourlyRows(
		workflowId: string,
		since: Date,
	): Promise<Array<{ periodStart: Date; value: number }>> {
		return await this.createQueryBuilder('insights')
			.select('insights.periodStart', 'periodStart')
			.addSelect('insights.value', 'value')
			.innerJoin('insights.metadata', 'metadata')
			.where('metadata.workflowId = :workflowId', { workflowId })
			.andWhere("insights.periodUnit = 'hour'")
			.andWhere("insights.type = 'success' OR insights.type = 'failure'")
			.andWhere('insights.periodStart >= :since', { since })
			.getRawMany();
	}
```

- [ ] **Step 5: Update `ProjectExecutionQuotaService`**

Add `InsightsByPeriodRepository` as a fifth constructor dependency and add `getSpikes`:

```ts
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly quotaRepository: ProjectExecutionQuotaRepository,
		private readonly counterRepository: ProjectExecutionCounterRepository,
		private readonly license: License,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
	) {}
```

```ts
	private static readonly SPIKE_MULTIPLIER = 5;

	/**
	 * Flag-only: workflows whose executions today exceed SPIKE_MULTIPLIER
	 * times their own trailing 7-day daily average. Never gates execution —
	 * see spec "Spike-Guard (flag only)".
	 */
	async getSpikes(projectId: string) {
		const today = computePeriodBucket('day', DateTime.utc());
		const todaysCounts = await this.counterRepository.findByProjectId(projectId, 'day', today);

		const spikes = [];
		for (const { workflowId, count } of todaysCounts) {
			const since = DateTime.utc().minus({ days: 7 }).startOf('day').toJSDate();
			const hourlyRows = await this.insightsByPeriodRepository.getTrailingHourlyRows(
				workflowId,
				since,
			);

			const byDay = new Map<string, number>();
			for (const row of hourlyRows) {
				const day = DateTime.fromJSDate(row.periodStart).toFormat('yyyy-MM-dd');
				byDay.set(day, (byDay.get(day) ?? 0) + row.value);
			}
			byDay.delete(today);

			const days = [...byDay.values()];
			if (days.length === 0) continue;

			const baseline = days.reduce((sum, value) => sum + value, 0) / days.length;
			if (baseline > 0 && count > baseline * ProjectExecutionQuotaService.SPIKE_MULTIPLIER) {
				spikes.push({
					workflowId,
					todayCount: count,
					baseline,
					multiplier: ProjectExecutionQuotaService.SPIKE_MULTIPLIER,
				});
			}
		}

		return spikes;
	}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter=n8n test -- project-execution-quota.service.test.ts`
Expected: PASS. Update the earlier tests in this file that construct `ProjectExecutionQuotaService` with four arguments to pass a fifth mocked `InsightsByPeriodRepository`.

- [ ] **Step 7: Add the controller endpoints**

Open `packages/cli/src/controllers/project.controller.ts`. First, find the exact DTO pattern by inspecting an existing simple DTO, e.g. run `find packages/@n8n/api-types/src -iname "*project*.dto.ts"` and open one (such as `update-project.dto.ts`) to copy its exact base-class/import pattern before writing the new DTO below — the base class and zod usage must match what that file actually uses in this checkout, not be guessed.

Create `packages/@n8n/api-types/src/dto/project/update-project-execution-quota.dto.ts` (path may differ slightly — match wherever the file found above lives) modeled directly on that file's pattern, with two fields: `limit: number` and `periodUnit: 'day' | 'week' | 'month'`.

Add three endpoints to `ProjectController`, injecting `ProjectExecutionQuotaService` into its constructor:

```ts
	@Get('/:projectId/execution-quota')
	@ProjectScope('project:read')
	async getExecutionQuota(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		return await this.projectExecutionQuotaService.getConsumption(projectId);
	}

	@Patch('/:projectId/execution-quota')
	@ProjectScope('project:manageExecutionQuota')
	async updateExecutionQuota(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: UpdateProjectExecutionQuotaDto,
		@Param('projectId') projectId: string,
	) {
		await this.projectExecutionQuotaService.setLimit(projectId, payload.limit, payload.periodUnit);
	}

	@Get('/:projectId/execution-quota/spikes')
	@ProjectScope('project:read')
	async getExecutionQuotaSpikes(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		return await this.projectExecutionQuotaService.getSpikes(projectId);
	}
```

- [ ] **Step 8: Manual verification**

Start the dev server (`pnpm dev:be` or the local demo recipe from `poc-workflow-tests`), create a project, and call the three endpoints with `curl` against a session cookie or API key to confirm they respond with the expected shapes and that `PATCH` without `project:manageExecutionQuota` (e.g. as a project viewer) is rejected with 403.

- [ ] **Step 9: Commit**

```bash
git add packages/@n8n/permissions/ packages/cli/src/controllers/project.controller.ts packages/cli/src/execution-quota/ packages/@n8n/db/src/repositories/project-execution-counter.repository.ts packages/cli/src/modules/insights/database/repositories/insights-by-period.repository.ts packages/@n8n/api-types/
git commit -m "feat(execution-quota): add project scope, REST endpoints, and spike-guard query"
```

---

### Task 7: Insights-consistency reconciliation test

**Files:**
- Test: `packages/cli/src/execution-quota/__tests__/insights-consistency.integration.test.ts`

**Interfaces:**
- Consumes: `ProjectExecutionQuotaService.assertWithinQuotaAndIncrement` (Task 4), `InsightsCompactionService.compactInsights()` and the `db-utils.ts` seeding helpers (`createRawInsightsEvent`, `createMetadata`) from the existing Insights test suite, `insights.service.ts:getInsightsSummary`.

This is the concrete proof for the spec's central claim: for executions that reach a countable terminal status, the live counter and Insights agree.

- [ ] **Step 1: Write the test**

Create `packages/cli/src/execution-quota/__tests__/insights-consistency.integration.test.ts`, following the exact setup pattern from `insights-compaction.service.integration.test.ts` (`testModules.loadModules(['insights'])`, `testDb.init()`, `testDb.truncate([...])` per test):

```ts
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { createMetadata, createRawInsightsEvent } from '@/modules/insights/database/entities/__tests__/db-utils';
import { InsightsCompactionService } from '@/modules/insights/insights-compaction.service';
import { InsightsService } from '@/modules/insights/insights.service';

import { ProjectExecutionCounterRepository } from '@n8n/db';
import { ProjectExecutionQuotaService } from '../project-execution-quota.service';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'ProjectExecutionCounter',
		'ProjectExecutionQuota',
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

test('live counter matches Insights for clean-completing executions in the same period', async () => {
	const project = await createTeamProject();
	const workflow = await createWorkflow({}, project);
	await createMetadata(workflow);

	const quotaService = Container.get(ProjectExecutionQuotaService);
	const counterRepository = Container.get(ProjectExecutionCounterRepository);
	const compactionService = Container.get(InsightsCompactionService);
	const insightsService = Container.get(InsightsService);

	// Simulate 4 clean, successful executions: the pre-execution gate
	// increments the live counter, and (mirroring what Insights would record
	// for a completed 'success' run) a matching raw insights event is seeded.
	for (let i = 0; i < 4; i++) {
		await quotaService.assertWithinQuotaAndIncrement(workflow.id, 'webhook');
		await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp: new Date() });
	}

	await compactionService.compactRawToHour();

	const today = new Date().toISOString().slice(0, 10);
	const liveTotal = await counterRepository.getProjectPeriodTotal(project.id, 'day', today);

	const user = (await import('@n8n/backend-test-utils')).createOwner
		? await (await import('@n8n/backend-test-utils')).createOwner()
		: undefined;
	const summary = await insightsService.getInsightsSummary({
		user,
		projectId: project.id,
		startDate: new Date(new Date().setHours(0, 0, 0, 0)),
		endDate: new Date(),
	} as never);

	expect(liveTotal).toBe(4);
	expect(summary.total.value).toBe(4);
});
```

Note: if `createOwner` isn't the actual export name in `@n8n/backend-test-utils` for this checkout, grep that package for the existing user-seeding helper used by other Insights tests (e.g. search `insights.service.test.ts` or similar for how they construct a `User` to pass to `getInsightsSummary`) and use that helper instead — don't guess the name.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter=n8n test:integration -- insights-consistency.integration.test.ts`
Expected: PASS. If it fails on the `user`/access-filter path, that's the one integration detail research didn't fully resolve (how `resolveAccessFilter` behaves for an owner user) — resolve by reading `insights.service.ts:resolveAccessFilter` directly at that point, not by loosening the assertion.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/execution-quota/__tests__/insights-consistency.integration.test.ts
git commit -m "test(execution-quota): reconciliation test proving parity with Insights"
```

---

### Task 8: Frontend — execution quota settings section

**Files:**
- Create: `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectExecutionQuota.vue`
- Modify: `packages/frontend/editor-ui/src/features/collaboration/projects/views/ProjectSettings.vue`
- Modify: `packages/frontend/editor-ui/src/features/collaboration/projects/projects.store.ts` (or wherever `useProjectsStore` lives — confirm exact path via `find packages/frontend/editor-ui/src -iname "projects.store.ts"`)

**Interfaces:**
- Consumes: `GET /projects/:id/execution-quota`, `PATCH /projects/:id/execution-quota` (Task 6).
- Produces: a `<ProjectExecutionQuota :project-id="..." />` component slotted into `ProjectSettings.vue`.

- [ ] **Step 1: Add store methods**

In the projects store, add two methods following the existing pattern used for other project mutations (e.g. `updateProject`):

```ts
async function getExecutionQuota(projectId: string) {
	return await makeRestApiRequest(rootStore.restApiContext, 'GET', `/projects/${projectId}/execution-quota`);
}

async function updateExecutionQuota(
	projectId: string,
	payload: { limit: number; periodUnit: 'day' | 'week' | 'month' },
) {
	return await makeRestApiRequest(
		rootStore.restApiContext,
		'PATCH',
		`/projects/${projectId}/execution-quota`,
		payload,
	);
}
```

Match the exact `makeRestApiRequest` import/call signature already used elsewhere in this store file — copy an existing method's call verbatim and adjust the path/method/payload.

- [ ] **Step 2: Build the component**

Create `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectExecutionQuota.vue`, following the `N8nInputNumber` + `N8nSelect` + save-flow pattern from `WorkflowSettings.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nButton, N8nInputNumber, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useProjectsStore } from '../projects.store';

const props = defineProps<{ projectId: string; canManage: boolean }>();

const i18n = useI18n();
const toast = useToast();
const projectsStore = useProjectsStore();

const limit = ref<number | undefined>();
const periodUnit = ref<'day' | 'week' | 'month'>('day');
const consumed = ref(0);
const isLoading = ref(false);

const periodOptions = [
	{ value: 'day', label: i18n.baseText('projects.settings.executionQuota.period.day') },
	{ value: 'week', label: i18n.baseText('projects.settings.executionQuota.period.week') },
	{ value: 'month', label: i18n.baseText('projects.settings.executionQuota.period.month') },
];

onMounted(async () => {
	const quota = await projectsStore.getExecutionQuota(props.projectId);
	limit.value = quota.limit;
	periodUnit.value = quota.periodUnit;
	consumed.value = quota.consumed;
});

const save = async () => {
	if (limit.value === undefined) return;
	isLoading.value = true;
	try {
		await projectsStore.updateExecutionQuota(props.projectId, {
			limit: limit.value,
			periodUnit: periodUnit.value,
		});
		toast.showMessage({
			title: i18n.baseText('projects.settings.executionQuota.saved'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.executionQuota.saveError'));
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
	<fieldset data-test-id="project-execution-quota">
		<N8nText tag="h3" size="medium" bold class="pb-2xs">
			{{ i18n.baseText('projects.settings.executionQuota.title') }}
		</N8nText>
		<N8nText tag="p" size="small" color="text-light" class="pb-xs">
			{{ i18n.baseText('projects.settings.executionQuota.description') }}
		</N8nText>
		<div v-if="canManage" class="pb-xs">
			<N8nInputNumber v-model="limit" :min="1" :precision="0" data-test-id="execution-quota-limit" />
			<N8nSelect v-model="periodUnit" data-test-id="execution-quota-period">
				<N8nOption v-for="opt in periodOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
			</N8nSelect>
			<N8nButton :loading="isLoading" @click="save">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</div>
		<N8nText v-else tag="p" size="small">
			{{ consumed }} / {{ limit ?? '∞' }} {{ periodUnit }}
		</N8nText>
	</fieldset>
</template>
```

- [ ] **Step 3: Slot it into `ProjectSettings.vue`**

In `ProjectSettings.vue`, import the new component and add it after `<ProjectExternalSecrets ... />` in the template, gated the same way `canManageMembers` gates the members fieldset:

```ts
const canManageExecutionQuota = computed(
	() => !!getResourcePermissions(projectsStore.currentProject?.scopes).project.manageExecutionQuota,
);
```

```html
<ProjectExecutionQuota
	:project-id="route.params.projectId as string"
	:can-manage="canManageExecutionQuota"
/>
```

- [ ] **Step 4: Manual verification**

Run `pnpm dev:fe:editor` (or the combined `pnpm dev:fe`) alongside the backend, open a team project's settings page as a project admin, confirm the section renders, saves a limit, and reloads with the saved value; then view as a project viewer and confirm the input controls are hidden and only the read-only consumption line shows.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/collaboration/projects/
git commit -m "feat(execution-quota): add project settings UI for execution quota"
```

---

### Task 9: Frontend — consumption card and spike badge

**Files:**
- Create: `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectExecutionQuotaCard.vue`
- Modify: wherever the project overview/workflow-list view renders (confirm exact file via `find packages/frontend/editor-ui/src -iname "*ProjectOverview*" -o -iname "*ProjectHome*"`)

**Interfaces:**
- Consumes: `GET /projects/:id/execution-quota`, `GET /projects/:id/execution-quota/spikes` (Task 6).

- [ ] **Step 1: Build the card component**

Create `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectExecutionQuotaCard.vue`, adapting the tile/status-coloring structure from `InsightsSummary.vue` (a bordered tile, a `computed` mapping status to a color class) but simplified to one metric instead of five tabs:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, useCssModule } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '../projects.store';

const props = defineProps<{ projectId: string }>();

const i18n = useI18n();
const $style = useCssModule();
const projectsStore = useProjectsStore();

const quota = ref<{ limit: number; periodUnit: string; consumed: number; remaining: number | null }>();

onMounted(async () => {
	quota.value = await projectsStore.getExecutionQuota(props.projectId);
});

const isUnlimited = computed(() => quota.value?.remaining === null);
const isOverQuota = computed(() => quota.value !== undefined && quota.value.remaining === 0);
const statusClass = computed(() => (isOverQuota.value ? $style.danger : $style.neutral));
</script>

<template>
	<div v-if="quota" :class="[$style.card, statusClass]" data-test-id="project-execution-quota-card">
		<N8nText tag="strong" size="small">
			{{ i18n.baseText('projects.executionQuota.card.title') }}
		</N8nText>
		<N8nText tag="span" size="large" bold>
			{{ quota.consumed }} / {{ isUnlimited ? '∞' : quota.limit }}
		</N8nText>
		<N8nText tag="small" color="text-light">{{ quota.periodUnit }}</N8nText>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: 6px;
}
.neutral {
	color: var(--color--text--shade-1);
}
.danger {
	color: var(--color--danger);
	border-color: var(--color--danger);
}
</style>
```

- [ ] **Step 2: Add a spike badge to the workflow list**

In the project's workflow-list view (path confirmed by the `find` above), for each workflow row, call `GET /projects/:id/execution-quota/spikes` once per project view load (not per row), store the result keyed by `workflowId`, and render a small warning badge (reuse `N8nBadge` from the design system, `type="warning"`) next to any workflow name present in that spike list, with a tooltip showing `todayCount` vs `baseline`.

- [ ] **Step 3: Manual verification**

With the backend running, seed one workflow with a normal execution history and another with an artificial spike (run it many times in a short window), confirm the card shows correct consumption and the spiking workflow shows the badge while the normal one doesn't.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/collaboration/projects/
git commit -m "feat(execution-quota): add consumption card and spike badge to project view"
```

---

### Task 10: Playwright demo script

**Files:**
- Create: `.superpowers/sdd/2026-09-01-project-execution-limits-poc/demo-walkthrough.mjs` (mirroring the location/naming used by `poc-workflow-tests`)

**Interfaces:**
- Consumes: the full stack built in Tasks 1-9 running locally.

- [ ] **Step 1: Write the script**

Model this directly on `poc-workflow-tests`'s `demo-walkthrough.mjs` (same worktree family, check `~/.config/superpowers/worktrees/n8n/poc-workflow-tests/.superpowers/sdd/2026-08-12-workflow-tests-poc/demo-walkthrough.mjs` for the exact Playwright bootstrap/login/screenshot pattern already proven to work against a local n8n instance). The new script should:

1. Log in as the seeded demo user.
2. Create (or navigate to) a team project.
3. Open project settings, set the execution quota to a small number (e.g. 3/day) as project admin.
4. Trigger a workflow in that project 4 times (exceeding the quota on the 4th), capturing a screenshot of the resulting error surfaced to the user.
5. Navigate to the project view, screenshot the consumption card showing 3/3 (or however the UI represents "at quota").
6. Seed an artificial spike for a second workflow (many rapid executions) and screenshot the spike badge appearing next to it.

- [ ] **Step 2: Run it against a local instance**

Start the local demo instance the same way `poc-workflow-tests` documented (`N8N_ENABLED_MODULES=... node packages/cli/bin/n8n start` with a fresh `N8N_USER_FOLDER`), run the script, confirm all screenshots are captured without errors.

- [ ] **Step 3: Commit**

```bash
git add .superpowers/sdd/2026-09-01-project-execution-limits-poc/
git commit -m "docs: add Playwright demo walkthrough for execution limits PoC"
```

---

## Self-Review Notes

- **Spec coverage:** Goals 1-5 map to Tasks 6+8 (admin sets limit), 8+9 (consumption visibility), 4+5 (hard rejection), 2+4+7 (Insights consistency + documented gap), 6+9 (spike flag). Non-Goals are respected: no queueing/grace buffer added anywhere, no worker-level code touched, no scheduled job added for the spike-guard (computed on demand in Task 6).
- **Type consistency verified:** `ExecutionQuotaPeriodUnit` is defined once (Task 3, `project-execution-quota.ts`) and imported everywhere else that needs it (Tasks 1, 4, 6) rather than re-declared. `ProjectExecutionQuotaService`'s constructor grows from 4 to 5 args across Tasks 4 and 6 — Task 6 Step 6 explicitly calls out updating the earlier tests for the new arg.
- **Known research gaps flagged inline, not papered over:** Task 6 Step 7 (DTO base-class pattern) and Task 7 Step 1 (user-seeding helper name for `getInsightsSummary`) point the implementer at a concrete file-finding action instead of guessing an unverified API.
