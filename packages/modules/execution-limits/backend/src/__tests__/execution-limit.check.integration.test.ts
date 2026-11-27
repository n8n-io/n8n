import { Logger, type LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitPolicyCheck } from '../execution-limit.check';
import { ExecutionLimitsService } from '../execution-limits.service';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { ExecutionUsageCache } from '../execution-usage-cache';
import { toUtcDay } from '../execution-usage-period';
import { ExecutionUsageService } from '../execution-usage.service';

describe('ExecutionLimitPolicyCheck with a database', () => {
	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('refuses a run from the loaded usage, after the usage rows are gone', async () => {
		const project = await createTeamProject();
		const limitsService = Container.get(ExecutionLimitsService);
		await limitsService.updateSettings({ periodUnit: 'month', instanceMaxExecutions: 1000 }, null);
		await limitsService.setProjectLimits([{ projectId: project.id, maxExecutions: 5 }], null);
		const usageRows = Container.get(DataSource).getRepository(ExecutionLimitUsage);
		await usageRows.insert({
			projectId: project.id,
			day: toUtcDay(new Date()),
			entityType: 'workflow',
			startedCount: 5,
			blockedCount: 0,
			updatedAt: new Date(),
		});
		await Container.get(ExecutionLimitsSnapshot).reload();
		await Container.get(ExecutionUsageCache).refresh();

		// A refusal now can only come from memory.
		await usageRows.clear();

		const licenseState = mock<LicenseState>();
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		const check = new ExecutionLimitPolicyCheck(
			limitsService,
			Container.get(ExecutionUsageService),
			licenseState,
			Container.get(Logger),
		);
		const { violations } = await check.onExecutionAdmission({
			artifact: { kind: 'workflow', id: 'wf-1', name: 'Nightly sync' },
			projectId: project.id,
			mode: 'trigger',
			source: null,
			engine: 'v1',
		});

		expect(violations).toEqual([
			expect.objectContaining({ scope: 'project', projectId: project.id, limit: 5, usage: 5 }),
		]);
	});
});
