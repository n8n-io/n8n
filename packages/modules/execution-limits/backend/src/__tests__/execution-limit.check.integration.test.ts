import { Logger, type LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyCheck } from '../execution-limit.check';
import { ExecutionLimitsService } from '../execution-limits.service';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { ExecutionUsageCache } from '../execution-usage-cache';
import { toUtcDay } from '../execution-usage-period';
import { ExecutionUsageService } from '../execution-usage.service';
import { assignPolicyToProject, insertPolicy } from './policy-rows';

describe('ExecutionLimitPolicyCheck with a database', () => {
	const admit = async (projectId: string) => {
		const licenseState = mock<LicenseState>();
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		const check = new ExecutionLimitPolicyCheck(
			Container.get(ExecutionLimitsService),
			Container.get(ExecutionUsageService),
			licenseState,
			Container.get(Logger),
		);

		return await check.onExecutionAdmission({
			artifact: { kind: 'workflow', id: 'wf-1', name: 'Nightly sync' },
			projectId,
			mode: 'trigger',
			source: null,
			engine: 'v1',
		});
	};

	const usageRow = (startedCount: number) => ({
		day: toUtcDay(new Date()),
		entityType: 'workflow' as const,
		startedCount,
		blockedCount: 0,
		updatedAt: new Date(),
	});

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
	});

	beforeEach(async () => {
		const dataSource = Container.get(DataSource);
		await dataSource.getRepository(ExecutionLimitUsage).clear();
		await dataSource.getRepository(ExecutionLimitInstanceUsage).clear();
		await dataSource.getRepository(ExecutionLimitPolicy).delete({});
		await testDb.truncate(['Project', 'Settings']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('refuses a run from the loaded instance usage, after the usage rows are gone', async () => {
		const project = await createTeamProject();
		await Container.get(ExecutionLimitsService).updateSettings(
			{ periodUnit: 'month', instanceMaxExecutions: 5 },
			null,
		);
		const usageRows = Container.get(DataSource).getRepository(ExecutionLimitInstanceUsage);
		await usageRows.insert(usageRow(5));
		await Container.get(ExecutionLimitsSnapshot).reload();
		await Container.get(ExecutionUsageCache).refresh();

		// A refusal now can only come from memory.
		await usageRows.clear();

		const { violations } = await admit(project.id);

		expect(violations).toEqual([
			expect.objectContaining({ scope: 'instance', projectId: project.id, limit: 5, usage: 5 }),
		]);
	});

	it('refuses a run of a project with a policy at its limit and allows a project with none', async () => {
		const [limited, free] = [await createTeamProject(), await createTeamProject()];
		const policyId = await insertPolicy({ name: 'Free tier', maxExecutions: 5 });
		await assignPolicyToProject(policyId, limited.id);
		const usageRows = Container.get(DataSource).getRepository(ExecutionLimitUsage);
		await usageRows.insert([
			{ ...usageRow(5), projectId: limited.id },
			{ ...usageRow(50), projectId: free.id },
		]);
		await Container.get(ExecutionLimitsSnapshot).reload();
		await Container.get(ExecutionUsageCache).refresh();

		// A refusal now can only come from memory.
		await usageRows.clear();

		expect((await admit(limited.id)).violations).toEqual([
			expect.objectContaining({
				scope: 'project',
				projectId: limited.id,
				limit: 5,
				usage: 5,
				policyId,
				policyName: 'Free tier',
			}),
		]);
		expect((await admit(free.id)).violations).toEqual([]);
	});
});
