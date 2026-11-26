import { DEFAULT_EXECUTION_LIMIT_SETTINGS } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { BadRequestError } from '@n8n/errors';

import { ExecutionLimitAudit } from '../execution-limit-audit.entity';
import { ExecutionLimitAuditRepository } from '../execution-limit-audit.repository';
import type { ExecutionLimitsEventMap } from '../execution-limits.events';
import { ExecutionLimitsService } from '../execution-limits.service';

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
		// The delete of a project also deletes its limit.
		await testDb.truncate(['Project', 'Settings', 'ExecutionLimitAudit']);
		events.length = 0;
	});

	async function readAuditRows() {
		return await Container.get(DataSource).manager.find(ExecutionLimitAudit, {
			select: { projectId: true, field: true, oldValue: true, newValue: true, updatedBy: true },
			order: { id: 'ASC' },
		});
	}

	async function removeLimitInTransaction(projectId: string) {
		return await Container.get(TransactionRunner).run(
			{},
			async (ctx) => await service.removeLimitOfDeletedProject(projectId, USER_ID, undefined, ctx),
		);
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

			await service.updateSettings({ defaultProjectMaxExecutions: 50 }, USER_ID);

			expect(await service.getSettings()).toEqual({
				periodUnit: 'week',
				instanceMaxExecutions: 1000,
				defaultProjectMaxExecutions: 50,
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

		it('rejects a default limit for new projects above the instance limit', async () => {
			await service.updateSettings(
				{
					instanceMaxExecutions: 100,
					defaultProjectMaxExecutions: 100,
				},
				USER_ID,
			);

			await expect(
				service.updateSettings({ defaultProjectMaxExecutions: 101 }, USER_ID),
			).rejects.toThrow(BadRequestError);
			await expect(service.updateSettings({ instanceMaxExecutions: 99 }, USER_ID)).rejects.toThrow(
				BadRequestError,
			);

			expect(await service.getSettings()).toMatchObject({
				instanceMaxExecutions: 100,
				defaultProjectMaxExecutions: 100,
			});
		});

		it('accepts an instance limit below a project limit and keeps the project limit', async () => {
			const project = await createTeamProject();
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 500 }], USER_ID);

			await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);

			expect(await service.getProjectLimits()).toEqual([
				{ projectId: project.id, maxExecutions: 500 },
			]);
		});
	});

	describe('getApplicableLimits', () => {
		it('returns the saved limits of a project from memory after each write', async () => {
			const project = await createTeamProject();

			await service.updateSettings({ periodUnit: 'day', instanceMaxExecutions: 1000 }, USER_ID);
			expect(service.getApplicableLimits(project.id)).toEqual({
				periodUnit: 'day',
				instanceMaxExecutions: 1000,
				projectMaxExecutions: null,
			});

			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 50 }], USER_ID);
			expect(service.getApplicableLimits(project.id)?.projectMaxExecutions).toBe(50);

			await service.removeProjectLimits([project.id], USER_ID);
			expect(service.getApplicableLimits(project.id)?.projectMaxExecutions).toBeNull();
		});
	});

	describe('project limits', () => {
		it('sets the limit of many projects and reads them back', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const limits = [
				{ projectId: first.id, maxExecutions: 10 },
				{ projectId: second.id, maxExecutions: 20 },
			];

			await service.setProjectLimits(limits, USER_ID);

			expect(await service.getProjectLimits()).toEqual(expect.arrayContaining(limits));
			expect(await service.getProjectLimits([second.id])).toEqual([limits[1]]);
		});

		it('replaces the limit of a project that has one', async () => {
			const project = await createTeamProject();
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 10 }], USER_ID);

			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 20 }], USER_ID);

			expect(await service.getProjectLimits()).toEqual([
				{ projectId: project.id, maxExecutions: 20 },
			]);
		});

		it('rejects a batch with an unknown project and sets no limit', async () => {
			const project = await createTeamProject();

			await expect(
				service.setProjectLimits(
					[
						{ projectId: project.id, maxExecutions: 10 },
						{ projectId: 'unknown-project', maxExecutions: 10 },
					],
					USER_ID,
				),
			).rejects.toThrow('These projects do not exist: unknown-project');

			expect(await service.getProjectLimits()).toEqual([]);
		});

		it('rejects a batch that names a project two times', async () => {
			const project = await createTeamProject();

			await expect(
				service.setProjectLimits(
					[
						{ projectId: project.id, maxExecutions: 10 },
						{ projectId: project.id, maxExecutions: 20 },
					],
					USER_ID,
				),
			).rejects.toThrow(BadRequestError);
		});

		it.each([0, 1.5, 2_147_483_648])('rejects the out of range limit %d', async (maxExecutions) => {
			const project = await createTeamProject();

			await expect(
				service.setProjectLimits([{ projectId: project.id, maxExecutions }], USER_ID),
			).rejects.toThrow(BadRequestError);
		});

		it('rejects a limit above the instance limit and sets no limit', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);

			await expect(
				service.setProjectLimits(
					[
						{ projectId: first.id, maxExecutions: 100 },
						{ projectId: second.id, maxExecutions: 101 },
					],
					USER_ID,
				),
			).rejects.toThrow(BadRequestError);

			expect(await service.getProjectLimits()).toEqual([]);
			expect(events).toHaveLength(1);
			expect(await readAuditRows()).toHaveLength(1);
		});

		it('removes the limit of the given projects only', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			await service.setProjectLimits(
				[
					{ projectId: first.id, maxExecutions: 10 },
					{ projectId: second.id, maxExecutions: 20 },
				],
				USER_ID,
			);

			await service.removeProjectLimits([first.id, 'project-with-no-limit'], USER_ID);

			expect(await service.getProjectLimits()).toEqual([
				{ projectId: second.id, maxExecutions: 20 },
			]);
		});

		it('removes the limit of a project when the project is deleted', async () => {
			const project = await createTeamProject();
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 10 }], USER_ID);

			await Container.get(ProjectRepository).delete({ id: project.id });

			expect(await service.getProjectLimits()).toEqual([]);
		});
	});

	describe('default limit for new projects', () => {
		it('copies the default limit to the project and keeps it when the default changes', async () => {
			const project = await createTeamProject();
			await service.updateSettings({ defaultProjectMaxExecutions: 50 }, USER_ID);

			await service.applyDefaultLimitToNewProject(project.id);
			await service.updateSettings({ defaultProjectMaxExecutions: null }, USER_ID);

			expect(await service.getProjectLimits([project.id])).toEqual([
				{ projectId: project.id, maxExecutions: 50 },
			]);
		});

		it('sets no limit when there is no default limit', async () => {
			const project = await createTeamProject();

			await service.applyDefaultLimitToNewProject(project.id);

			expect(await service.getProjectLimits()).toEqual([]);
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

		it('records one row and emits one event for each project limit that is set, changed or removed', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const project = { field: 'projectMaxExecutions', updatedBy: USER_ID };

			await service.setProjectLimits(
				[
					{ projectId: first.id, maxExecutions: 10 },
					{ projectId: second.id, maxExecutions: 20 },
				],
				USER_ID,
			);
			await service.setProjectLimits([{ projectId: first.id, maxExecutions: 30 }], USER_ID);
			await service.removeProjectLimits([second.id], USER_ID);
			await (await removeLimitInTransaction(first.id))();

			expect(events).toEqual([
				{ ...project, projectId: first.id, oldValue: null, newValue: 10 },
				{ ...project, projectId: second.id, oldValue: null, newValue: 20 },
				{ ...project, projectId: first.id, oldValue: 10, newValue: 30 },
				{ ...project, projectId: second.id, oldValue: 20, newValue: null },
				{ ...project, projectId: first.id, oldValue: 30, newValue: null },
			]);
			expect(await readAuditRows()).toEqual(events);
		});

		it('records and emits nothing for a write that changes no value', async () => {
			const project = await createTeamProject();
			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 10 }], USER_ID);
			events.length = 0;
			const rowsBefore = await readAuditRows();

			await service.updateSettings({ instanceMaxExecutions: 1000 }, USER_ID);
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 10 }], USER_ID);
			await service.removeProjectLimits(['project-with-no-limit'], USER_ID);
			await (await removeLimitInTransaction('project-with-no-limit'))();

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
