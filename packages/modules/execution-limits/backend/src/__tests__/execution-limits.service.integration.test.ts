import { DEFAULT_EXECUTION_LIMIT_SETTINGS } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { BadRequestError } from '@n8n/errors';

import { ExecutionLimitAudit } from '../execution-limit-audit.entity';
import { ExecutionLimitAuditRepository } from '../execution-limit-audit.repository';
import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import type { ExecutionLimitsEventMap } from '../execution-limits.events';
import { ExecutionLimitsService } from '../execution-limits.service';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { assignPolicyToProject, insertPolicy } from './policy-rows';

const USER_ID = '0b0f6f3e-6a53-4f0c-9d3b-2f2a8f1c5e11';

describe('ExecutionLimitsService', () => {
	let service: ExecutionLimitsService;
	const events: Array<ExecutionLimitsEventMap['execution-limit-updated']> = [];

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		service = Container.get(ExecutionLimitsService);
		Container.get(EventService).on('execution-limit-updated', (event) => events.push(event));
	});

	beforeEach(async () => {
		await testDb.truncate(['Project', 'Settings', 'ExecutionLimitAudit']);
		await Container.get(DataSource).getRepository(ExecutionLimitPolicy).delete({});
		events.length = 0;
	});

	async function readAuditRows() {
		return await Container.get(DataSource).manager.find(ExecutionLimitAudit, {
			select: { projectId: true, field: true, oldValue: true, newValue: true, updatedBy: true },
			order: { id: 'ASC' },
		});
	}

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('settings', () => {
		it('reads the default settings when none were saved', async () => {
			expect(await service.getSettings()).toEqual(DEFAULT_EXECUTION_LIMIT_SETTINGS);
		});

		it('saves the first change on top of the default settings', async () => {
			const saved = await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);

			const expected = { ...DEFAULT_EXECUTION_LIMIT_SETTINGS, instanceMaxExecutions: 1000 };
			expect(saved).toEqual(expected);
			expect(await service.getSettings()).toEqual(expected);
		});

		it('keeps the settings that a change does not name', async () => {
			await service.updateSettings({ periodUnit: 'week', instanceMaxExecutions: 1000 }, USER_ID);

			await service.updateSettings({ instanceMaxExecutions: 500 }, USER_ID);

			expect(await service.getSettings()).toEqual({
				periodUnit: 'week',
				instanceMaxExecutions: 500,
			});
		});

		it('removes a limit that a change sets to null', async () => {
			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);

			await service.updateSettings({ instanceMaxExecutions: null }, USER_ID);

			expect((await service.getSettings()).instanceMaxExecutions).toBeNull();
		});

		it('rejects a change that is not valid and stores nothing', async () => {
			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);

			await expect(service.updateSettings({ instanceMaxExecutions: 0 }, USER_ID)).rejects.toThrow(
				BadRequestError,
			);

			expect((await service.getSettings()).instanceMaxExecutions).toBe(1000);
			expect(events).toHaveLength(1);
			expect(await readAuditRows()).toHaveLength(1);
		});

		const saveRowOfOlderVersion = async () =>
			await Container.get(SettingsRepository).upsertByKey(
				'features.executionLimits',
				JSON.stringify({
					periodUnit: 'week',
					instanceMaxExecutions: 1000,
					defaultProjectMaxExecutions: 50,
				}),
				false,
				{},
			);

		it('reads a row that an older version saved with a default project limit', async () => {
			await saveRowOfOlderVersion();

			const settings = await service.getSettings();

			expect(settings).toEqual({ periodUnit: 'week', instanceMaxExecutions: 1000 });
			expect(settings).not.toHaveProperty('defaultProjectMaxExecutions');
		});

		it('saves a change on top of a row that has a default project limit, without that key', async () => {
			await saveRowOfOlderVersion();

			const saved = await service.updateSettings({ instanceMaxExecutions: 500 }, USER_ID);

			expect(saved).toEqual({ periodUnit: 'week', instanceMaxExecutions: 500 });
			const row = await Container.get(SettingsRepository).findByKey('features.executionLimits');
			expect(JSON.parse(row?.value ?? '{}')).toEqual({
				periodUnit: 'week',
				instanceMaxExecutions: 500,
			});
		});
	});

	describe('getApplicableLimits', () => {
		it('returns the saved instance limit from memory after each write', async () => {
			const project = await createTeamProject();

			await service.updateSettings({ periodUnit: 'day', instanceMaxExecutions: 1000 }, USER_ID);
			expect(service.getApplicableLimits(project.id)).toEqual({
				periodUnit: 'day',
				instanceMaxExecutions: 1000,
				projectMaxExecutions: null,
			});

			await service.updateSettings({ instanceMaxExecutions: null }, USER_ID);
			expect(service.getApplicableLimits(project.id)?.instanceMaxExecutions).toBeNull();
		});

		it('returns the limit of the policy of a project after a snapshot reload', async () => {
			const [limited, free] = [await createTeamProject(), await createTeamProject()];
			await assignPolicyToProject(await insertPolicy({ maxExecutions: 25 }), limited.id);

			await Container.get(ExecutionLimitsSnapshot).reload();

			expect(service.getApplicableLimits(limited.id)?.projectMaxExecutions).toBe(25);
			expect(service.getApplicableLimits(free.id)?.projectMaxExecutions).toBeNull();
		});
	});

	describe('audit', () => {
		it('records one row and emits one event for each setting that is set, changed or removed', async () => {
			await service.updateSettings({ periodUnit: 'week', instanceMaxExecutions: 1000 }, USER_ID);
			await service.updateSettings({ instanceMaxExecutions: 500 }, USER_ID);
			await service.updateSettings({ instanceMaxExecutions: null }, null);

			const instance = { projectId: null, updatedBy: USER_ID };
			expect(events).toEqual([
				{ ...instance, field: 'periodUnit', oldValue: 'month', newValue: 'week' },
				{ ...instance, field: 'instanceMaxExecutions', oldValue: null, newValue: 1000 },
				{ ...instance, field: 'instanceMaxExecutions', oldValue: 1000, newValue: 500 },
				{
					...instance,
					field: 'instanceMaxExecutions',
					oldValue: 500,
					newValue: null,
					updatedBy: null,
				},
			]);
			expect(await readAuditRows()).toEqual(events);
		});

		it('records and emits nothing for a write that changes no value', async () => {
			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);
			events.length = 0;
			const rowsBefore = await readAuditRows();

			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);

			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual(rowsBefore);
		});

		it('keeps the limit and emits nothing when the row cannot be recorded', async () => {
			vi.spyOn(Container.get(ExecutionLimitAuditRepository), 'append').mockRejectedValueOnce(
				new Error('The audit table is not available'),
			);

			await expect(
				service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID),
			).rejects.toThrow('The audit table is not available');

			expect((await service.getSettings()).instanceMaxExecutions).toBeNull();
			expect(events).toEqual([]);
		});

		it('adds the login of a service account to the event and the row', async () => {
			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID, 'login-1');

			expect(events).toEqual([expect.objectContaining({ loginId: 'login-1' })]);
			expect(await Container.get(DataSource).manager.find(ExecutionLimitAudit)).toEqual([
				expect.objectContaining({ loginId: 'login-1' }),
			]);
		});
	});
});
