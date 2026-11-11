import {
	createWorkflow,
	getPersonalProject,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import {
	AuthIdentity,
	Project,
	ProjectRelation,
	ServiceAccountDetails,
	SharedWorkflow,
	User,
	WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';

import { ServiceAccountService } from '@/services/service-account.service';

import { createMember } from '../shared/db/users';

describe('ServiceAccountService', () => {
	let service: ServiceAccountService;
	let manager: EntityManager;

	beforeAll(async () => {
		await testDb.init();
		service = Container.get(ServiceAccountService);
		manager = Container.get(DataSource).manager;
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** Every row that a service account owns, so a test can assert all of them at once. */
	async function rowsOf(serviceAccountId: string) {
		return {
			user: await manager.findOne(User, {
				where: { id: serviceAccountId },
				relations: { role: true },
			}),
			details: await manager.findOneBy(ServiceAccountDetails, { userId: serviceAccountId }),
			project: await manager.findOneBy(Project, { type: 'personal', creatorId: serviceAccountId }),
			relations: await manager.find(ProjectRelation, {
				where: { userId: serviceAccountId },
				relations: { role: true },
			}),
		};
	}

	describe('create', () => {
		it('creates the account, its details and a personal project that it owns', async () => {
			const { serviceAccount, project } = await service.create('Support agent');

			const rows = await rowsOf(serviceAccount.id);
			expect(rows.user?.kind).toBe('service');
			expect(rows.user?.role.slug).toBe('global:agent');
			expect(rows.details?.name).toBe('Support agent');
			expect(rows.project).toMatchObject({ id: project.id, name: 'Support agent' });
			expect(rows.relations).toHaveLength(1);
			expect(rows.relations[0]).toMatchObject({ projectId: project.id });
			expect(rows.relations[0].role.slug).toBe('project:personalOwner');
		});

		it('saves no row when an insert fails', async () => {
			const save = EntityManager.prototype.save;
			vi.spyOn(EntityManager.prototype, 'save').mockImplementation(async function (
				this: EntityManager,
				...args: Parameters<EntityManager['save']>
			) {
				if (args[0] instanceof ProjectRelation) throw new Error('Insert failed');
				return await save.apply(this, args);
			} as EntityManager['save']);

			await expect(service.create('Support agent')).rejects.toThrow('Insert failed');

			expect(await manager.count(User, { where: { kind: 'service' } })).toBe(0);
			expect(await manager.count(ServiceAccountDetails)).toBe(0);
			expect(await manager.count(Project)).toBe(0);
		});
	});

	describe('remove', () => {
		it('removes the account, its details, its personal project and the shares into it', async () => {
			const person = await createMember();
			const workflow = await createWorkflow({}, person);
			const { serviceAccount, project } = await service.create('Support agent');
			await shareWorkflowWithProjects(workflow, [{ project }]);

			await service.remove(serviceAccount.id, person);

			expect(await rowsOf(serviceAccount.id)).toEqual({
				user: null,
				details: null,
				project: null,
				relations: [],
			});
			expect(await manager.existsBy(SharedWorkflow, { projectId: project.id })).toBe(false);
			// The person still owns the workflow.
			expect(await manager.existsBy(WorkflowEntity, { id: workflow.id })).toBe(true);
		});

		it('also removes an identity binding of the account', async () => {
			const person = await createMember();
			const { serviceAccount } = await service.create('Support agent');
			await manager.save(AuthIdentity.create(serviceAccount, 'agent-subject', 'oidc'));

			await service.remove(serviceAccount.id, person);

			expect(await rowsOf(serviceAccount.id)).toMatchObject({ user: null, project: null });
			expect(await manager.existsBy(AuthIdentity, { userId: serviceAccount.id })).toBe(false);
		});

		it('moves the work of the personal project to the transfer project, as for a person', async () => {
			const person = await createMember();
			const { serviceAccount, project } = await service.create('Support agent');
			const workflow = await createWorkflow({}, project);
			const target = await getPersonalProject(person);

			await service.remove(serviceAccount.id, person, target.id);

			expect(await rowsOf(serviceAccount.id)).toMatchObject({ user: null, project: null });
			const owner = await manager.findOneByOrFail(SharedWorkflow, {
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
			expect(owner.projectId).toBe(target.id);
		});

		it('deletes the work of the personal project without a transfer project, as for a person', async () => {
			const person = await createMember();
			const { serviceAccount, project } = await service.create('Support agent');
			const workflow = await createWorkflow({}, project);

			await service.remove(serviceAccount.id, person);

			expect(await rowsOf(serviceAccount.id)).toMatchObject({ user: null, project: null });
			expect(await manager.existsBy(WorkflowEntity, { id: workflow.id })).toBe(false);
		});

		it('does nothing for the id of a person', async () => {
			const person = await createMember();
			const actor = await createMember();

			await service.remove(person.id, actor);

			expect(await manager.existsBy(User, { id: person.id })).toBe(true);
			expect(await manager.existsBy(Project, { type: 'personal', creatorId: person.id })).toBe(
				true,
			);
		});
	});
});
