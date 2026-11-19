import { DEFAULT_EXECUTION_LIMIT_SETTINGS } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { ExecutionLimitsService } from '../execution-limits.service';

describe('ExecutionLimitsService', () => {
	let service: ExecutionLimitsService;

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		service = Container.get(ExecutionLimitsService);
	});

	beforeEach(async () => {
		// The delete of a project also deletes its limit.
		await testDb.truncate(['Project', 'Settings']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('settings', () => {
		it('reads the default settings when none were saved', async () => {
			expect(await service.getSettings()).toEqual(DEFAULT_EXECUTION_LIMIT_SETTINGS);
		});

		it('saves the first change on top of the default settings', async () => {
			const saved = await service.updateSettings({ instanceMaxExecutions: 1000 });

			const expected = { ...DEFAULT_EXECUTION_LIMIT_SETTINGS, instanceMaxExecutions: 1000 };
			expect(saved).toEqual(expected);
			expect(await service.getSettings()).toEqual(expected);
		});

		it('keeps the settings that a change does not name', async () => {
			await service.updateSettings({ periodUnit: 'week', instanceMaxExecutions: 1000 });

			await service.updateSettings({ defaultProjectMaxExecutions: 50 });

			expect(await service.getSettings()).toEqual({
				periodUnit: 'week',
				instanceMaxExecutions: 1000,
				defaultProjectMaxExecutions: 50,
			});
		});

		it('removes a limit that a change sets to null', async () => {
			await service.updateSettings({ instanceMaxExecutions: 1000 });

			await service.updateSettings({ instanceMaxExecutions: null });

			expect((await service.getSettings()).instanceMaxExecutions).toBeNull();
		});

		it('rejects a change that is not valid and stores nothing', async () => {
			await service.updateSettings({ instanceMaxExecutions: 1000 });

			await expect(service.updateSettings({ instanceMaxExecutions: 0 })).rejects.toThrow(
				BadRequestError,
			);

			expect((await service.getSettings()).instanceMaxExecutions).toBe(1000);
		});

		it('rejects a default limit for new projects above the instance limit', async () => {
			await service.updateSettings({
				instanceMaxExecutions: 100,
				defaultProjectMaxExecutions: 100,
			});

			await expect(service.updateSettings({ defaultProjectMaxExecutions: 101 })).rejects.toThrow(
				BadRequestError,
			);
			await expect(service.updateSettings({ instanceMaxExecutions: 99 })).rejects.toThrow(
				BadRequestError,
			);

			expect(await service.getSettings()).toMatchObject({
				instanceMaxExecutions: 100,
				defaultProjectMaxExecutions: 100,
			});
		});

		it('accepts an instance limit below a project limit and keeps the project limit', async () => {
			const project = await createTeamProject();
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 500 }]);

			await service.updateSettings({ instanceMaxExecutions: 100 });

			expect(await service.getProjectLimits()).toEqual([
				{ projectId: project.id, maxExecutions: 500 },
			]);
		});
	});

	describe('getApplicableLimits', () => {
		it('returns the saved limits of a project from memory after each write', async () => {
			const project = await createTeamProject();

			await service.updateSettings({ periodUnit: 'day', instanceMaxExecutions: 1000 });
			expect(service.getApplicableLimits(project.id)).toEqual({
				periodUnit: 'day',
				instanceMaxExecutions: 1000,
				projectMaxExecutions: null,
			});

			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 50 }]);
			expect(service.getApplicableLimits(project.id)?.projectMaxExecutions).toBe(50);

			await service.removeProjectLimits([project.id]);
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

			await service.setProjectLimits(limits);

			expect(await service.getProjectLimits()).toEqual(expect.arrayContaining(limits));
			expect(await service.getProjectLimits([second.id])).toEqual([limits[1]]);
		});

		it('replaces the limit of a project that has one', async () => {
			const project = await createTeamProject();
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 10 }]);

			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 20 }]);

			expect(await service.getProjectLimits()).toEqual([
				{ projectId: project.id, maxExecutions: 20 },
			]);
		});

		it('rejects a batch with an unknown project and sets no limit', async () => {
			const project = await createTeamProject();

			await expect(
				service.setProjectLimits([
					{ projectId: project.id, maxExecutions: 10 },
					{ projectId: 'unknown-project', maxExecutions: 10 },
				]),
			).rejects.toThrow('These projects do not exist: unknown-project');

			expect(await service.getProjectLimits()).toEqual([]);
		});

		it('rejects a batch that names a project two times', async () => {
			const project = await createTeamProject();

			await expect(
				service.setProjectLimits([
					{ projectId: project.id, maxExecutions: 10 },
					{ projectId: project.id, maxExecutions: 20 },
				]),
			).rejects.toThrow(BadRequestError);
		});

		it.each([0, 1.5, 2_147_483_648])('rejects the out of range limit %d', async (maxExecutions) => {
			const project = await createTeamProject();

			await expect(
				service.setProjectLimits([{ projectId: project.id, maxExecutions }]),
			).rejects.toThrow(BadRequestError);
		});

		it('rejects a limit above the instance limit and sets no limit', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			await service.updateSettings({ instanceMaxExecutions: 100 });

			await expect(
				service.setProjectLimits([
					{ projectId: first.id, maxExecutions: 100 },
					{ projectId: second.id, maxExecutions: 101 },
				]),
			).rejects.toThrow(BadRequestError);

			expect(await service.getProjectLimits()).toEqual([]);
		});

		it('removes the limit of the given projects only', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			await service.setProjectLimits([
				{ projectId: first.id, maxExecutions: 10 },
				{ projectId: second.id, maxExecutions: 20 },
			]);

			await service.removeProjectLimits([first.id, 'project-with-no-limit']);

			expect(await service.getProjectLimits()).toEqual([
				{ projectId: second.id, maxExecutions: 20 },
			]);
		});

		it('removes the limit of a project when the project is deleted', async () => {
			const project = await createTeamProject();
			await service.setProjectLimits([{ projectId: project.id, maxExecutions: 10 }]);

			await Container.get(ProjectRepository).delete({ id: project.id });

			expect(await service.getProjectLimits()).toEqual([]);
		});
	});
});
