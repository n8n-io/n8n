import { In } from '@n8n/typeorm';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { SharedWorkflow } from '../../entities/shared-workflow';
import type { TagEntity } from '../../entities/tag-entity';
import { WorkflowEntity } from '../../entities/workflow-entity';
import { WorkflowTagMapping } from '../../entities/workflow-tag-mapping';
import {
	loadWorkflowCollections,
	splitWorkflowRelations,
	wasDeletedAfterRead,
} from '../workflow-collections';

const workflowWithId = (id: string) => Object.assign(new WorkflowEntity(), { id });

describe('splitWorkflowRelations', () => {
	it('keeps undefined relations as they are', () => {
		expect(splitWorkflowRelations(undefined)).toEqual({ relations: undefined, collections: {} });
	});

	it.each([
		[['tags', 'activeVersion'], { activeVersion: true }, { tags: true }],
		[['shared'], {}, { shared: true }],
		[['shared', 'shared.project'], {}, { shared: { project: true } }],
		[['shared.project'], {}, { shared: { project: true } }],
		[[], {}, {}],
	])('splits the relation paths %j', (relations, joined, collections) => {
		expect(splitWorkflowRelations(relations)).toEqual({ relations: joined, collections });
	});

	it.each([
		[{ activeVersion: true, shared: true }, { activeVersion: true }, { shared: true }],
		[
			{ shared: { project: true }, parentFolder: true },
			{ parentFolder: true },
			{ shared: { project: true } },
		],
		[{ shared: { project: false } }, {}, { shared: true }],
		[{ tags: true, shared: true }, {}, { tags: true, shared: true }],
		[{ tags: false, activeVersion: true }, { tags: false, activeVersion: true }, {}],
	])('splits the relations object %j', (relations, joined, collections) => {
		expect(splitWorkflowRelations(relations)).toEqual({ relations: joined, collections });
	});

	it('keeps a collection joined when it asks for nested relations the loader does not cover', () => {
		const relations = {
			shared: { project: { projectRelations: true } },
			tags: { workflows: true },
		};

		expect(splitWorkflowRelations(relations)).toEqual({ relations, collections: {} });
	});

	it.each([
		[{ shared: { projectId: 'project-1' } }, 'shared'],
		[[{ id: 'workflow-1' }, { tags: { name: 'prod' } }], 'tags'],
	])('keeps a collection joined when where %j filters on it', (where, collection) => {
		const { relations, collections } = splitWorkflowRelations(
			{ tags: true, shared: true, activeVersion: true },
			where,
		);

		expect(relations).toHaveProperty(collection, true);
		expect(collections).not.toHaveProperty(collection);
	});

	it('does not change the relations it was given', () => {
		const relations = { tags: true, shared: { project: true } };

		splitWorkflowRelations(relations);

		expect(relations).toEqual({ tags: true, shared: { project: true } });
	});
});

describe('loadWorkflowCollections', () => {
	const manager = mock<EntityManager>();
	let tagQuery: SelectQueryBuilder<WorkflowTagMapping>;

	beforeEach(() => {
		vi.resetAllMocks();
		tagQuery = mock<SelectQueryBuilder<WorkflowTagMapping>>();
		for (const method of ['innerJoinAndMapOne', 'where', 'orderBy', 'addOrderBy'] as const) {
			vi.mocked(tagQuery[method]).mockReturnValue(tagQuery);
		}
		manager.createQueryBuilder.mockReturnValue(tagQuery as never);
	});

	it('runs no query for an empty list', async () => {
		await loadWorkflowCollections(manager, [], { tags: true, shared: { project: true } });

		expect(manager.find).not.toHaveBeenCalled();
		expect(manager.createQueryBuilder).not.toHaveBeenCalled();
	});

	it('runs no query when no collection is asked for', async () => {
		await loadWorkflowCollections(manager, [workflowWithId('workflow-1')], {});

		expect(manager.find).not.toHaveBeenCalled();
		expect(manager.createQueryBuilder).not.toHaveBeenCalled();
	});

	it('assigns each workflow its shares, and an empty list to a workflow without shares', async () => {
		const first = workflowWithId('workflow-1');
		const second = workflowWithId('workflow-2');
		const shares = [
			mock<SharedWorkflow>({ workflowId: 'workflow-1', projectId: 'project-a' }),
			mock<SharedWorkflow>({ workflowId: 'workflow-1', projectId: 'project-b' }),
		];
		manager.find.mockResolvedValueOnce(shares);

		await loadWorkflowCollections(manager, [first, second, first], { shared: { project: true } });

		expect(manager.find).toHaveBeenCalledTimes(1);
		expect(manager.find).toHaveBeenCalledWith(SharedWorkflow, {
			where: { workflowId: In(['workflow-1', 'workflow-2']) },
			relations: { project: true },
			order: { createdAt: 'ASC', projectId: 'ASC' },
		});
		expect(first.shared).toEqual(shares);
		expect(second.shared).toEqual([]);
	});

	it('loads shares without their projects when not asked', async () => {
		manager.find.mockResolvedValueOnce([]);

		await loadWorkflowCollections(manager, [workflowWithId('workflow-1')], { shared: true });

		expect(manager.find).toHaveBeenCalledWith(
			SharedWorkflow,
			expect.objectContaining({ relations: { project: false } }),
		);
	});

	it('assigns each workflow its tags in creation order', async () => {
		const first = workflowWithId('workflow-1');
		const second = workflowWithId('workflow-2');
		const billing = mock<TagEntity>({ id: 'tag-1', name: 'billing' });
		const prod = mock<TagEntity>({ id: 'tag-2', name: 'prod' });
		vi.mocked(tagQuery.getMany).mockResolvedValueOnce([
			{ workflowId: 'workflow-1', tagId: 'tag-1', tag: billing },
			{ workflowId: 'workflow-1', tagId: 'tag-2', tag: prod },
		] as unknown as WorkflowTagMapping[]);

		await loadWorkflowCollections(manager, [first, second], { tags: true });

		expect(manager.createQueryBuilder).toHaveBeenCalledWith(WorkflowTagMapping, 'mapping');
		expect(tagQuery.where).toHaveBeenCalledWith('mapping.workflowId IN (:...ids)', {
			ids: ['workflow-1', 'workflow-2'],
		});
		expect(tagQuery.orderBy).toHaveBeenCalledWith('tag.createdAt', 'ASC');
		expect(first.tags).toEqual([billing, prod]);
		expect(second.tags).toEqual([]);
	});

	it('reads ids in batches and merges the results', async () => {
		const workflows = Array.from({ length: 10_001 }, (_, index) =>
			workflowWithId(`workflow-${index}`),
		);
		const firstShare = mock<SharedWorkflow>({ workflowId: 'workflow-0' });
		const lastShare = mock<SharedWorkflow>({ workflowId: 'workflow-10000' });
		manager.find.mockResolvedValueOnce([firstShare]).mockResolvedValueOnce([lastShare]);

		await loadWorkflowCollections(manager, workflows, { shared: true });

		expect(manager.find).toHaveBeenCalledTimes(2);
		expect(workflows[0].shared).toEqual([firstShare]);
		expect(workflows[10_000].shared).toEqual([lastShare]);
		expect(workflows[5_000].shared).toEqual([]);
	});
});

describe('wasDeletedAfterRead', () => {
	const manager = mock<EntityManager>();
	const withShares = (shared: SharedWorkflow[]) =>
		Object.assign(workflowWithId('workflow-1'), { shared });

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('runs no query for a workflow with shares', async () => {
		const workflow = withShares([mock<SharedWorkflow>({ workflowId: 'workflow-1' })]);

		expect(await wasDeletedAfterRead(manager, workflow)).toBe(false);
		expect(manager.existsBy).not.toHaveBeenCalled();
	});

	it('reports a workflow without shares whose row is gone as deleted', async () => {
		manager.existsBy.mockResolvedValueOnce(false);

		expect(await wasDeletedAfterRead(manager, withShares([]))).toBe(true);
		expect(manager.existsBy).toHaveBeenCalledWith(WorkflowEntity, { id: 'workflow-1' });
	});

	it('does not report a workflow that still exists without shares as deleted', async () => {
		manager.existsBy.mockResolvedValueOnce(true);

		expect(await wasDeletedAfterRead(manager, withShares([]))).toBe(false);
	});
});
