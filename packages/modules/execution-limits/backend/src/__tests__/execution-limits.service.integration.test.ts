import { DEFAULT_EXECUTION_LIMIT_SETTINGS } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, SettingsRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import { ExecutionLimitAudit } from '../execution-limit-audit.entity';
import { ExecutionLimitAuditRepository } from '../execution-limit-audit.repository';
import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyRepository } from '../execution-limit-policy.repository';
import type { ExecutionLimitsEventMap } from '../execution-limits.events';
import { ExecutionLimitsService } from '../execution-limits.service';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { assignPolicyToGroup, assignPolicyToProject, insertPolicy } from './policy-rows';

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
			select: {
				projectId: true,
				policyId: true,
				field: true,
				oldValue: true,
				newValue: true,
				updatedBy: true,
			},
			order: { id: 'ASC' },
		});
	}

	afterAll(async () => {
		await testDb.terminate();
	});

	const policyIdsOf = async (projectId: string) =>
		(await Container.get(ExecutionLimitPolicyRepository).findProjectPolicies({}, [projectId])).map(
			({ policyId }) => policyId,
		);

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
				projectPolicy: null,
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
		it('applies the lowest policy of a project with two rows, and names that policy', async () => {
			const project = await createTeamProject();
			const high = await insertPolicy({ name: 'High', maxExecutions: 500 });
			const low = await insertPolicy({ name: 'Low', maxExecutions: 20 });
			await assignPolicyToProject(high, project.id);
			await assignPolicyToProject(low, project.id);

			await Container.get(ExecutionLimitsSnapshot).reload();

			expect(service.getApplicableLimits(project.id)).toMatchObject({
				projectMaxExecutions: 20,
				projectPolicy: { id: low, name: 'Low' },
			});
		});

		it('accepts an instance limit below the policy of a project and keeps the policy', async () => {
			const project = await createTeamProject();
			await assignPolicyToProject(await insertPolicy({ maxExecutions: 500 }), project.id);

			await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);

			expect(service.getApplicableLimits(project.id)).toMatchObject({
				instanceMaxExecutions: 100,
				projectMaxExecutions: 500,
			});
		});
	});

	describe('audit', () => {
		it('records one row and emits one event for each setting that is set, changed or removed', async () => {
			await service.updateSettings({ periodUnit: 'week', instanceMaxExecutions: 1000 }, USER_ID);
			await service.updateSettings({ instanceMaxExecutions: 500 }, USER_ID);
			await service.updateSettings({ instanceMaxExecutions: null }, null);

			const instance = { projectId: null, policyId: null, updatedBy: USER_ID };
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

	describe('policies', () => {
		const policyRows = async () =>
			await Container.get(DataSource).getRepository(ExecutionLimitPolicy).find();
		const reload = async () => await Container.get(ExecutionLimitsSnapshot).reload();
		const repository = () => Container.get(ExecutionLimitPolicyRepository);

		describe('createPolicy', () => {
			it('stores the policy with a trimmed name and records one row and one event', async () => {
				const policy = await service.createPolicy(
					{ name: '  Free tier  ', maxExecutions: 50 },
					USER_ID,
				);

				expect(policy).toEqual({ id: expect.any(String), name: 'Free tier', maxExecutions: 50 });
				expect(await repository().findPolicy(policy.id, {})).toEqual(policy);
				const expected = {
					projectId: null,
					policyId: policy.id,
					field: 'policy',
					oldValue: null,
					newValue: { name: 'Free tier', maxExecutions: 50 },
					updatedBy: USER_ID,
				};
				expect(await readAuditRows()).toEqual([expected]);
				expect(events).toEqual([expected]);
			});

			it('rejects a name that another policy has, also after the trim', async () => {
				await insertPolicy({ name: 'Free tier' });

				await expect(
					service.createPolicy({ name: ' Free tier ', maxExecutions: 10 }, USER_ID),
				).rejects.toThrow(ConflictError);

				expect(await policyRows()).toHaveLength(1);
				expect(events).toEqual([]);
				expect(await readAuditRows()).toEqual([]);
			});

			it.each([
				['an empty name', ''],
				['a blank name', '   '],
				['a name with 129 characters', 'x'.repeat(129)],
			])('rejects %s', async (_, name) => {
				await expect(service.createPolicy({ name, maxExecutions: 10 }, USER_ID)).rejects.toThrow(
					BadRequestError,
				);

				expect(await policyRows()).toEqual([]);
			});

			it('accepts a name with 128 characters', async () => {
				const name = 'x'.repeat(128);

				const policy = await service.createPolicy({ name, maxExecutions: 10 }, USER_ID);

				expect(policy.name).toBe(name);
			});

			it.each([0, 1.5, 2_147_483_648])(
				'rejects the out of range maximum %d',
				async (maxExecutions) => {
					await expect(
						service.createPolicy({ name: 'Policy', maxExecutions }, USER_ID),
					).rejects.toThrow(BadRequestError);

					expect(await policyRows()).toEqual([]);
				},
			);

			it('rejects a maximum above the instance limit and accepts one equal to it', async () => {
				await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);
				events.length = 0;

				await expect(
					service.createPolicy({ name: 'Above', maxExecutions: 101 }, USER_ID),
				).rejects.toThrow(BadRequestError);
				await expect(
					service.createPolicy({ name: 'Equal', maxExecutions: 100 }, USER_ID),
				).resolves.toMatchObject({ name: 'Equal' });

				expect((await policyRows()).map(({ name }) => name)).toEqual(['Equal']);
				expect(events).toHaveLength(1);
			});
		});

		describe('updatePolicy', () => {
			it('gives a new maximum to every project of the policy after one snapshot reload', async () => {
				const [first, second] = [await createTeamProject(), await createTeamProject()];
				const policyId = await insertPolicy({ name: 'Free tier', maxExecutions: 10 });
				await assignPolicyToProject(policyId, first.id);
				await assignPolicyToProject(policyId, second.id);
				await reload();

				await service.updatePolicy(policyId, { maxExecutions: 30 }, USER_ID);

				expect(service.getApplicableLimits(first.id)?.projectMaxExecutions).toBe(30);
				expect(service.getApplicableLimits(second.id)?.projectMaxExecutions).toBe(30);
				const expected = {
					projectId: null,
					policyId,
					field: 'policy',
					oldValue: { name: 'Free tier', maxExecutions: 10 },
					newValue: { name: 'Free tier', maxExecutions: 30 },
					updatedBy: USER_ID,
				};
				expect(await readAuditRows()).toEqual([expected]);
				expect(events).toEqual([expected]);
			});

			it('renames a policy and keeps its maximum', async () => {
				const policyId = await insertPolicy({ name: 'Old', maxExecutions: 10 });

				const policy = await service.updatePolicy(policyId, { name: ' New ' }, USER_ID);

				expect(policy).toEqual({ id: policyId, name: 'New', maxExecutions: 10 });
				expect(await repository().findPolicy(policyId, {})).toEqual(policy);
			});

			it('rejects a name that another policy has', async () => {
				await insertPolicy({ name: 'Taken' });
				const policyId = await insertPolicy({ name: 'Mine' });

				await expect(service.updatePolicy(policyId, { name: 'Taken' }, USER_ID)).rejects.toThrow(
					ConflictError,
				);

				expect((await repository().findPolicy(policyId, {}))?.name).toBe('Mine');
			});

			it('rejects a maximum above the instance limit and stores nothing', async () => {
				const policyId = await insertPolicy({ maxExecutions: 10 });
				await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);
				events.length = 0;

				await expect(
					service.updatePolicy(policyId, { maxExecutions: 101 }, USER_ID),
				).rejects.toThrow(BadRequestError);

				expect((await repository().findPolicy(policyId, {}))?.maxExecutions).toBe(10);
				expect(events).toEqual([]);
			});

			it('allows a rename when the maximum is already above a lowered instance limit', async () => {
				const policyId = await insertPolicy({ name: 'Old', maxExecutions: 500 });
				await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);

				await expect(
					service.updatePolicy(policyId, { name: 'New' }, USER_ID),
				).resolves.toMatchObject({ name: 'New', maxExecutions: 500 });
			});

			it('records and emits nothing for a change that keeps the name and the maximum', async () => {
				const policyId = await insertPolicy({ name: 'Same', maxExecutions: 10 });

				await service.updatePolicy(policyId, {}, USER_ID);
				await service.updatePolicy(policyId, { name: 'Same', maxExecutions: 10 }, USER_ID);
				await service.updatePolicy(policyId, { name: ' Same ' }, USER_ID);

				expect(events).toEqual([]);
				expect(await readAuditRows()).toEqual([]);
			});

			it('rejects a policy that does not exist', async () => {
				await expect(
					service.updatePolicy('0b0f6f3e-6a53-4f0c-9d3b-2f2a8f1c5e12', { name: 'New' }, USER_ID),
				).rejects.toThrow(NotFoundError);
			});
		});

		describe('duplicatePolicy', () => {
			it('makes a policy with the same maximum, a new name and no assignment', async () => {
				const project = await createTeamProject();
				const source = await insertPolicy({ name: 'Source', maxExecutions: 40 });
				await assignPolicyToProject(source, project.id);

				const copy = await service.duplicatePolicy(source, ' Copy ', USER_ID);

				expect(copy).toEqual({ id: expect.any(String), name: 'Copy', maxExecutions: 40 });
				expect(copy.id).not.toBe(source);
				expect((await repository().findProjectPolicies({})).map((row) => row.policyId)).toEqual([
					source,
				]);
				expect(await readAuditRows()).toEqual([
					{
						projectId: null,
						policyId: copy.id,
						field: 'policy',
						oldValue: null,
						newValue: { name: 'Copy', maxExecutions: 40 },
						updatedBy: USER_ID,
					},
				]);
			});

			it('rejects a name that another policy has, and a source that does not exist', async () => {
				const source = await insertPolicy({ name: 'Source' });

				await expect(service.duplicatePolicy(source, 'Source', USER_ID)).rejects.toThrow(
					ConflictError,
				);
				await expect(
					service.duplicatePolicy('0b0f6f3e-6a53-4f0c-9d3b-2f2a8f1c5e12', 'Copy', USER_ID),
				).rejects.toThrow(NotFoundError);
				await expect(service.duplicatePolicy(source, '  ', USER_ID)).rejects.toThrow(
					BadRequestError,
				);
				expect(await policyRows()).toHaveLength(1);
			});

			it('rejects a copy above a lowered instance limit', async () => {
				const source = await insertPolicy({ maxExecutions: 500 });
				await service.updateSettings({ instanceMaxExecutions: 100 }, USER_ID);

				await expect(service.duplicatePolicy(source, 'Copy', USER_ID)).rejects.toThrow(
					BadRequestError,
				);

				expect(await policyRows()).toHaveLength(1);
			});
		});

		describe('deletePolicy', () => {
			it('records one policy row, removes the assignments and lifts the limit', async () => {
				const project = await createTeamProject();
				const policyId = await insertPolicy({ name: 'Free tier', maxExecutions: 10 });
				await assignPolicyToProject(policyId, project.id);
				await assignPolicyToGroup(policyId, 'newProjects');
				await reload();

				await service.deletePolicy(policyId, USER_ID);

				expect(await policyRows()).toEqual([]);
				expect(await repository().findProjectPolicies({})).toEqual([]);
				expect(await repository().findGroupPolicyId('newProjects', {})).toBeNull();
				expect(service.getApplicableLimits(project.id)?.projectMaxExecutions).toBeNull();
				const expected = {
					projectId: null,
					policyId,
					field: 'policy',
					oldValue: { name: 'Free tier', maxExecutions: 10 },
					newValue: null,
					updatedBy: USER_ID,
				};
				expect(await readAuditRows()).toEqual([expected]);
				expect(events).toEqual([expected]);
			});

			it('rejects a policy that does not exist', async () => {
				await expect(
					service.deletePolicy('0b0f6f3e-6a53-4f0c-9d3b-2f2a8f1c5e12', USER_ID),
				).rejects.toThrow(NotFoundError);
			});
		});
	});

	describe('project assignments', () => {
		const projectChange = (
			projectId: string,
			policyId: string | null,
			oldValue: string | null,
			newValue: string | null,
		) => ({
			projectId,
			policyId,
			field: 'projectPolicy',
			oldValue,
			newValue,
			updatedBy: USER_ID,
		});

		it('replaces the policy of a project with the second policy and keeps one row', async () => {
			const project = await createTeamProject();
			const [first, second] = [await insertPolicy(), await insertPolicy()];

			await service.assignPolicyToProjects(first, [project.id], USER_ID);
			await service.assignPolicyToProjects(second, [project.id], USER_ID);

			expect(await policyIdsOf(project.id)).toEqual([second]);
			expect(events).toEqual([
				projectChange(project.id, first, null, first),
				projectChange(project.id, second, first, second),
			]);
			expect(await readAuditRows()).toEqual(events);
		});

		it('assigns the policy one time when a project is given two times', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy();

			await service.assignPolicyToProjects(policyId, [project.id, project.id], USER_ID);

			expect(await policyIdsOf(project.id)).toEqual([policyId]);
			expect(events).toEqual([projectChange(project.id, policyId, null, policyId)]);
		});

		it('records one row for each project, with no old policy for a project with none', async () => {
			const [first, second] = [await createTeamProject(), await createTeamProject()];
			const policyId = await insertPolicy({ maxExecutions: 15 });

			await service.assignPolicyToProjects(policyId, [first.id, second.id], USER_ID);

			expect(events).toEqual([
				projectChange(first.id, policyId, null, policyId),
				projectChange(second.id, policyId, null, policyId),
			]);
			expect(service.getApplicableLimits(first.id)?.projectMaxExecutions).toBe(15);
			expect(service.getApplicableLimits(second.id)?.projectMaxExecutions).toBe(15);
		});

		it('names the lowest policy as the old policy of a project with two rows, and leaves one row', async () => {
			const project = await createTeamProject();
			const [high, low, next] = [
				await insertPolicy({ maxExecutions: 500 }),
				await insertPolicy({ maxExecutions: 5 }),
				await insertPolicy({ maxExecutions: 50 }),
			];
			await assignPolicyToProject(high, project.id);
			await assignPolicyToProject(low, project.id);

			await service.assignPolicyToProjects(next, [project.id], USER_ID);

			expect(events).toEqual([projectChange(project.id, next, low, next)]);
			expect(await policyIdsOf(project.id)).toEqual([next]);
		});

		it('records and emits nothing when the project has this policy already', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy();
			await service.assignPolicyToProjects(policyId, [project.id], USER_ID);
			events.length = 0;
			const rowsBefore = await readAuditRows();

			await service.assignPolicyToProjects(policyId, [project.id], USER_ID);

			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual(rowsBefore);
		});

		it('rejects an unknown project and assigns the policy to no project', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy();

			await expect(
				service.assignPolicyToProjects(policyId, [project.id, 'unknown-project'], USER_ID),
			).rejects.toThrow('These projects do not exist: unknown-project');

			expect(await policyIdsOf(project.id)).toEqual([]);
			expect(events).toEqual([]);
		});

		it('rejects a personal project and assigns the policy to no project', async () => {
			const team = await createTeamProject();
			const projects = Container.get(ProjectRepository);
			const personal = await projects.save(projects.create({ name: 'Personal', type: 'personal' }));
			const policyId = await insertPolicy();

			await expect(
				service.assignPolicyToProjects(policyId, [team.id, personal.id], USER_ID),
			).rejects.toThrow(BadRequestError);

			expect(await policyIdsOf(team.id)).toEqual([]);
			expect(events).toEqual([]);
		});

		it('rejects a policy that does not exist', async () => {
			const project = await createTeamProject();

			await expect(
				service.assignPolicyToProjects(
					'0b0f6f3e-6a53-4f0c-9d3b-2f2a8f1c5e12',
					[project.id],
					USER_ID,
				),
			).rejects.toThrow(NotFoundError);
		});

		it('removes the policy of the given projects, one row for each, and ignores a project with none', async () => {
			const [first, second, free] = [
				await createTeamProject(),
				await createTeamProject(),
				await createTeamProject(),
			];
			const [policyA, policyB] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToProject(policyA, first.id);
			await assignPolicyToProject(policyB, second.id);

			await service.unassignPolicyFromProjects([first.id, second.id, free.id], USER_ID);

			expect(await policyIdsOf(first.id)).toEqual([]);
			expect(await policyIdsOf(second.id)).toEqual([]);
			expect(events).toEqual([
				projectChange(first.id, policyA, policyA, null),
				projectChange(second.id, policyB, policyB, null),
			]);
			expect(await readAuditRows()).toEqual(events);
		});

		it('records and emits nothing when no given project has a policy', async () => {
			const project = await createTeamProject();

			await service.unassignPolicyFromProjects([project.id, 'project-with-no-policy'], USER_ID);

			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual([]);
		});

		it('records the policy that a deleted project loses, in the transaction of the delete', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy();
			await assignPolicyToProject(policyId, project.id);

			const announce = await Container.get(TransactionRunner).run(
				{},
				async (ctx) =>
					await service.recordPolicyOfDeletedProject(project.id, USER_ID, undefined, ctx),
			);
			expect(events).toEqual([]);
			await announce();

			expect(await policyIdsOf(project.id)).toEqual([]);
			expect(events).toEqual([projectChange(project.id, policyId, policyId, null)]);
			expect(await readAuditRows()).toEqual(events);
		});

		it('records nothing and takes no settings lock for a deleted project with no policy', async () => {
			const project = await createTeamProject();

			const announce = await Container.get(TransactionRunner).run(
				{},
				async (ctx) =>
					await service.recordPolicyOfDeletedProject(project.id, USER_ID, undefined, ctx),
			);
			await announce();

			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual([]);
			// The lock creates the settings row, so no row means no lock.
			expect(
				await Container.get(SettingsRepository).findByKey('features.executionLimits'),
			).toBeNull();
		});
	});

	describe('group assignments', () => {
		const groupChange = (policyId: string, oldValue: string | null, newValue: string | null) => ({
			projectId: null,
			policyId,
			field: 'newProjectsPolicy',
			oldValue,
			newValue,
			updatedBy: USER_ID,
		});
		const repository = () => Container.get(ExecutionLimitPolicyRepository);
		const groupPolicy = async () =>
			await Container.get(ExecutionLimitPolicyRepository).findGroupPolicyId('newProjects', {});

		it('assigns a policy, replaces it with another and removes it, one row for each step', async () => {
			const [first, second] = [await insertPolicy(), await insertPolicy()];

			await service.assignPolicyToGroup(first, 'newProjects', USER_ID);
			expect(await groupPolicy()).toBe(first);
			await service.assignPolicyToGroup(second, 'newProjects', USER_ID);
			expect(await groupPolicy()).toBe(second);
			await service.unassignPolicyFromGroup('newProjects', USER_ID);
			expect(await groupPolicy()).toBeNull();

			expect(events).toEqual([
				groupChange(first, null, first),
				groupChange(second, first, second),
				groupChange(second, second, null),
			]);
			expect(await readAuditRows()).toEqual(events);
		});

		it('records and emits nothing for the same policy again and for a group with no policy', async () => {
			const policyId = await insertPolicy();
			await service.assignPolicyToGroup(policyId, 'newProjects', USER_ID);
			events.length = 0;

			await service.assignPolicyToGroup(policyId, 'newProjects', USER_ID);
			await service.unassignPolicyFromGroup('newProjects', USER_ID);
			events.length = 0;
			const rowsBefore = await readAuditRows();
			await service.unassignPolicyFromGroup('newProjects', USER_ID);

			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual(rowsBefore);
		});

		it('rejects a policy that does not exist', async () => {
			await expect(
				service.assignPolicyToGroup('0b0f6f3e-6a53-4f0c-9d3b-2f2a8f1c5e12', 'newProjects', USER_ID),
			).rejects.toThrow(NotFoundError);
		});

		it('leaves the projects that already have the policy as they are', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy();
			await assignPolicyToProject(policyId, project.id);

			await service.assignPolicyToGroup(policyId, 'newProjects', USER_ID);
			await service.unassignPolicyFromGroup('newProjects', USER_ID);

			expect(await repository().findProjectPolicies({}, [project.id])).toHaveLength(1);
		});
	});

	describe('policy of a new project', () => {
		it('assigns nothing and records nothing when no group policy is set', async () => {
			const project = await createTeamProject();

			await service.assignNewProjectsPolicyTo(project.id);

			expect(await policyIdsOf(project.id)).toEqual([]);
			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual([]);
		});

		it('assigns the group policy and records one row with no user', async () => {
			const project = await createTeamProject();
			const policyId = await insertPolicy({ maxExecutions: 12 });
			await assignPolicyToGroup(policyId, 'newProjects');

			await service.assignNewProjectsPolicyTo(project.id);

			expect(await policyIdsOf(project.id)).toEqual([policyId]);
			const expected = {
				projectId: project.id,
				policyId,
				field: 'projectPolicy',
				oldValue: null,
				newValue: policyId,
				updatedBy: null,
			};
			expect(events).toEqual([expected]);
			expect(await readAuditRows()).toEqual([expected]);
			expect(service.getApplicableLimits(project.id)?.projectMaxExecutions).toBe(12);
		});

		it('keeps the policy that the project has already and records nothing', async () => {
			const project = await createTeamProject();
			const [own, group] = [await insertPolicy(), await insertPolicy()];
			await assignPolicyToProject(own, project.id);
			await assignPolicyToGroup(group, 'newProjects');

			await service.assignNewProjectsPolicyTo(project.id);

			expect(await policyIdsOf(project.id)).toEqual([own]);
			expect(events).toEqual([]);
			expect(await readAuditRows()).toEqual([]);
		});

		it('does not assign the policy of the personal projects group', async () => {
			const project = await createTeamProject();
			await assignPolicyToGroup(await insertPolicy(), 'personalProjects');

			await service.assignNewProjectsPolicyTo(project.id);

			expect(await policyIdsOf(project.id)).toEqual([]);
		});
	});
});
