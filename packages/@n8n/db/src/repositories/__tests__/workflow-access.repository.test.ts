import { In, IsNull } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { Folder, Role, SharedWorkflow, type WorkflowEntity } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import type { SharedWorkflowRepository } from '../shared-workflow.repository';
import { WorkflowAccessRepository } from '../workflow-access.repository';

describe('WorkflowAccessRepository', () => {
	const manager = mockEntityManager(SharedWorkflow);
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const repository = new WorkflowAccessRepository(
		manager.connection,
		mock<TransactionRunner>(),
		sharedWorkflowRepository,
	);
	const access = {
		userId: 'user-1',
		projectRoles: ['project:editor'],
		workflowRoles: ['workflow:owner'],
	};
	const accessWhere = {
		role: In(['workflow:owner']),
		project: { projectRelations: { role: In(['project:editor']), userId: 'user-1' } },
	};

	beforeEach(() => vi.resetAllMocks());

	it('loads roles for access checks', async () => {
		manager.find.mockResolvedValue([]);

		await repository.findRolesForAccessCheck();

		expect(manager.find).toHaveBeenCalledWith(Role, { relations: ['scopes'] });
	});

	it('uses the operation context transaction for reads', async () => {
		const transactionManager = mockEntityManager(SharedWorkflow);
		transactionManager.find.mockResolvedValue([]);

		await repository.findRootWorkflowIdsInProject('project-1', false, {
			trx: new TypeOrmTransaction(transactionManager),
		});

		expect(transactionManager.find).toHaveBeenCalled();
		expect(manager.find).not.toHaveBeenCalled();
	});

	it('applies the access roles to a single workflow read', async () => {
		const workflow = mock<WorkflowEntity>();
		sharedWorkflowRepository.findWorkflowWithOptions.mockResolvedValue(
			Object.assign(new SharedWorkflow(), { workflow }),
		);
		const ctx = {};

		await expect(
			repository.findWorkflowForUser('workflow-1', access, { includeTags: true }, ctx),
		).resolves.toBe(workflow);
		expect(sharedWorkflowRepository.findWorkflowWithOptions).toHaveBeenCalledWith('workflow-1', {
			includeTags: true,
			where: accessWhere,
			ctx,
		});
	});

	it('does not filter a single workflow read without access roles', async () => {
		sharedWorkflowRepository.findWorkflowWithOptions.mockResolvedValue(null);

		await expect(repository.findWorkflowForUser('workflow-1', null)).resolves.toBeNull();
		expect(sharedWorkflowRepository.findWorkflowWithOptions).toHaveBeenCalledWith(
			'workflow-1',
			expect.objectContaining({ where: {} }),
		);
	});

	it('reads only the version columns of a workflow head', async () => {
		const updatedAt = new Date();
		manager.findOne.mockResolvedValue({
			workflow: { versionId: 'v-1', activeVersionId: null, updatedAt },
		});

		await expect(repository.findWorkflowHeadForUser('workflow-1', access)).resolves.toEqual({
			versionId: 'v-1',
			activeVersionId: null,
			updatedAt,
		});
		expect(manager.findOne).toHaveBeenCalledWith(
			SharedWorkflow,
			expect.objectContaining({ where: { workflowId: 'workflow-1', ...accessWhere } }),
		);
	});

	it('limits accessible workflow ids to a project', async () => {
		manager.find.mockResolvedValue([{ workflowId: 'workflow-1' }]);

		await expect(
			repository.findAccessibleWorkflowIds(['workflow-1', 'workflow-2'], null, 'project-1'),
		).resolves.toEqual(new Set(['workflow-1']));
		expect(manager.find).toHaveBeenCalledWith(SharedWorkflow, {
			select: { workflowId: true },
			where: { project: { id: 'project-1' }, workflowId: In(['workflow-1', 'workflow-2']) },
		});
	});

	it('chunks workflow reads and returns each workflow once', async () => {
		const first = Object.assign(mock<WorkflowEntity>(), { id: 'first' });
		const last = Object.assign(mock<WorkflowEntity>(), { id: 'last' });
		manager.find
			.mockResolvedValueOnce([{ workflow: first }, { workflow: first }])
			.mockResolvedValueOnce([{ workflow: last }]);
		const workflowIds = Array.from({ length: 10_001 }, (_, index) => `workflow-${index}`);

		const result = await repository.findWorkflowsByIdsForUser(workflowIds, access, {
			tags: true,
		});

		expect(result.map(({ id }) => id)).toEqual(['first', 'last']);
		expect(manager.find).toHaveBeenCalledTimes(2);
		expect(manager.find).toHaveBeenCalledWith(
			SharedWorkflow,
			expect.objectContaining({ relations: { workflow: { tags: true } } }),
		);
	});

	it('returns the parent folder of each workflow row', async () => {
		manager.find.mockResolvedValue([
			{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
			{ workflow: { id: 'w2', parentFolder: null } },
		]);

		await expect(repository.findWorkflowParentFolderIds(['f1'], false)).resolves.toEqual([
			{ workflowId: 'w1', parentFolderId: 'f1' },
			{ workflowId: 'w2', parentFolderId: null },
		]);
		expect(manager.find).toHaveBeenCalledWith(
			SharedWorkflow,
			expect.objectContaining({
				where: { workflow: { parentFolder: In(['f1']), isArchived: false } },
			}),
		);
	});

	it('maps owned workflow placements in a project', async () => {
		manager.find.mockResolvedValue([
			{ workflow: { id: 'w1', name: 'One', isArchived: true, parentFolder: null } },
		]);

		await expect(
			repository.findOwnedWorkflowPlacementsInProject('project-1', true),
		).resolves.toEqual([{ id: 'w1', name: 'One', parentFolderId: null, isArchived: true }]);
		expect(manager.find).toHaveBeenCalledWith(
			SharedWorkflow,
			expect.objectContaining({
				where: { project: { id: 'project-1' }, role: 'workflow:owner' },
			}),
		);
	});

	it('finds root workflows of a project', async () => {
		manager.find.mockResolvedValue([{ workflowId: 'w1' }]);

		await expect(repository.findRootWorkflowIdsInProject('project-1', false)).resolves.toEqual([
			'w1',
		]);
		expect(manager.find).toHaveBeenCalledWith(
			SharedWorkflow,
			expect.objectContaining({
				where: {
					project: { id: 'project-1' },
					role: 'workflow:owner',
					workflow: { parentFolder: IsNull(), isArchived: false },
				},
			}),
		);
	});

	it('matches source workflow ids and local ids in chunks', async () => {
		manager.find
			.mockResolvedValueOnce([{ workflow: { id: 'first' } }])
			.mockResolvedValueOnce([{ workflow: { id: 'last' } }]);
		const sourceWorkflowIds = Array.from({ length: 10_001 }, (_, index) => `source-${index}`);

		const result = await repository.findOwnedWorkflowsBySourceWorkflowIds(
			'project-1',
			sourceWorkflowIds,
		);

		expect(result.map(({ id }) => id)).toEqual(['first', 'last']);
		expect(manager.find).toHaveBeenCalledTimes(2);
		expect(manager.find).toHaveBeenLastCalledWith(SharedWorkflow, {
			where: [
				{
					projectId: 'project-1',
					role: 'workflow:owner',
					workflow: { sourceWorkflowId: In(['source-10000']), isArchived: false },
				},
				{
					projectId: 'project-1',
					role: 'workflow:owner',
					workflow: { id: In(['source-10000']), sourceWorkflowId: IsNull(), isArchived: false },
				},
			],
			relations: { workflow: { activeVersion: undefined, parentFolder: undefined } },
		});
	});

	it('returns distinct workflow ids for a user in folders of a project', async () => {
		manager.find.mockResolvedValue([{ workflowId: 'w1' }, { workflowId: 'w1' }]);

		await expect(
			repository.findWorkflowIdsForUser(access, {
				projectId: 'project-1',
				parentFolderIds: ['f1', 'f2'],
			}),
		).resolves.toEqual(['w1']);
		expect(manager.find).toHaveBeenCalledWith(SharedWorkflow, {
			select: { workflowId: true, projectId: true },
			where: {
				role: In(['workflow:owner']),
				project: {
					id: 'project-1',
					projectRelations: { role: In(['project:editor']), userId: 'user-1' },
				},
				workflow: { parentFolder: In(['f1', 'f2']) },
			},
		});
	});

	it('finds the home project of a folder', async () => {
		manager.findOne.mockResolvedValue({ homeProject: { id: 'project-1' } });

		await expect(repository.findFolderProjectId('folder-1')).resolves.toBe('project-1');
		expect(manager.findOne).toHaveBeenCalledWith(Folder, {
			where: { id: 'folder-1' },
			relations: { homeProject: true },
		});
	});

	it('delegates removal candidates to the shared workflow repository', async () => {
		sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates.mockResolvedValue([]);

		await repository.findOwnedWorkflowRemovalCandidates('project-1', ['w1'], {
			includeArchived: true,
		});

		expect(sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates).toHaveBeenCalledWith(
			'project-1',
			['w1'],
			{ includeArchived: true },
		);
	});
});
