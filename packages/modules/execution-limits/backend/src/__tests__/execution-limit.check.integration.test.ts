import { Logger, type LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitSettingsStore } from '../execution-limit-settings.store';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';
import { ExecutionLimitPolicyCheck } from '../execution-limit.check';
import { ExecutionLimitsService } from '../execution-limits.service';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { ExecutionUsageCache } from '../execution-usage-cache';
import { toUtcDay } from '../execution-usage-period';
import { ExecutionUsageService } from '../execution-usage.service';
import { ProjectExecutionLimitRepository } from '../project-execution-limit.repository';

describe('ExecutionLimitPolicyCheck with a database', () => {
	let limitsService: ExecutionLimitsService;
	let snapshot: ExecutionLimitsSnapshot;
	let cache: ExecutionUsageCache;
	let check: ExecutionLimitPolicyCheck;

	const today = () => toUtcDay(new Date());

	const addProjectUsage = async (projectId: string, startedCount: number) => {
		await Container.get(DataSource).getRepository(ExecutionLimitUsage).insert({
			projectId,
			day: today(),
			entityType: 'workflow',
			startedCount,
			blockedCount: 0,
			updatedAt: new Date(),
		});
	};

	const addInstanceUsage = async (startedCount: number) => {
		await Container.get(DataSource).getRepository(ExecutionLimitInstanceUsage).insert({
			day: today(),
			entityType: 'workflow',
			startedCount,
			blockedCount: 0,
			updatedAt: new Date(),
		});
	};

	const load = async () => {
		await snapshot.reload();
		await cache.refresh();
	};

	const admit = async (projectId: string | null) =>
		(
			await check.onExecutionAdmission({
				artifact: { kind: 'workflow', id: 'wf-1', name: 'Nightly sync' },
				projectId,
				mode: 'trigger',
				source: null,
				engine: 'v1',
			})
		).violations;

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		limitsService = Container.get(ExecutionLimitsService);
		snapshot = Container.get(ExecutionLimitsSnapshot);
		cache = Container.get(ExecutionUsageCache);

		const licenseState = mock<LicenseState>();
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		check = new ExecutionLimitPolicyCheck(
			limitsService,
			Container.get(ExecutionUsageService),
			licenseState,
			Container.get(Logger),
		);
	});

	beforeEach(async () => {
		await Container.get(DataSource).getRepository(ExecutionLimitUsage).clear();
		await Container.get(DataSource).getRepository(ExecutionLimitInstanceUsage).clear();
		// The delete of a project also deletes its limit.
		await testDb.truncate(['Project', 'Settings']);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('allows a run when the project usage is below its limit', async () => {
		const project = await createTeamProject();
		await limitsService.updateSettings({ periodUnit: 'month', instanceMaxExecutions: 1000 }, null);
		await limitsService.setProjectLimits([{ projectId: project.id, maxExecutions: 5 }], null);
		await addProjectUsage(project.id, 4);
		await load();

		expect(await admit(project.id)).toEqual([]);
	});

	it('refuses a run when the project usage is at its limit', async () => {
		const project = await createTeamProject();
		await limitsService.updateSettings({ periodUnit: 'month', instanceMaxExecutions: 1000 }, null);
		await limitsService.setProjectLimits([{ projectId: project.id, maxExecutions: 5 }], null);
		await addProjectUsage(project.id, 5);
		await load();

		const violations = await admit(project.id);

		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({
			kind: 'execution-limit',
			scope: 'project',
			projectId: project.id,
			limit: 5,
			usage: 5,
		});
	});

	it('refuses a run when the instance usage is at the instance limit', async () => {
		const project = await createTeamProject();
		await limitsService.updateSettings({ periodUnit: 'month', instanceMaxExecutions: 10 }, null);
		await addInstanceUsage(10);
		await load();

		const violations = await admit(project.id);

		expect(violations.map(({ scope }) => scope)).toEqual(['instance']);
	});

	it('reads no table at admission', async () => {
		const project = await createTeamProject();
		await limitsService.updateSettings({ periodUnit: 'month', instanceMaxExecutions: 1000 }, null);
		await limitsService.setProjectLimits([{ projectId: project.id, maxExecutions: 5 }], null);
		await addProjectUsage(project.id, 5);
		await addInstanceUsage(5);
		await load();
		const spies = [
			ExecutionLimitUsageRepository,
			ProjectExecutionLimitRepository,
			ExecutionLimitSettingsStore,
		].flatMap((token) => {
			const instance = Container.get<object>(token);
			return Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
				.filter((name) => name !== 'constructor')
				.filter((name) => typeof Reflect.get(instance, name) === 'function')
				.map((name) => vi.spyOn(instance as Record<string, never>, name as never));
		});

		const violations = await admit(project.id);

		expect(violations).toHaveLength(1);
		for (const spy of spies) expect(spy).not.toHaveBeenCalled();
	});
});
