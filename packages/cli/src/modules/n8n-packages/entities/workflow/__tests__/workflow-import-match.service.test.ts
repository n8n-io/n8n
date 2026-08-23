import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowImportMatchService } from '../workflow-import-match.service';

function workflow(attrs: {
	id: string;
	sourceWorkflowId?: string | null;
	name?: string;
	isArchived?: boolean;
	ownerProjectId?: string | null;
}): WorkflowEntity {
	return {
		id: attrs.id,
		name: attrs.name ?? `Workflow ${attrs.id}`,
		sourceWorkflowId: attrs.sourceWorkflowId ?? null,
		isArchived: attrs.isArchived ?? false,
		shared:
			attrs.ownerProjectId === undefined || attrs.ownerProjectId === null
				? []
				: [{ workflowId: attrs.id, projectId: attrs.ownerProjectId, role: 'workflow:owner' }],
	} as unknown as WorkflowEntity;
}

function makeService(workflows: WorkflowEntity[] = []) {
	const finder = mock<WorkflowFinderService>();
	finder.findOwnedWorkflowsBySourceWorkflowIds.mockResolvedValue(workflows);
	const workflowRepository = mock<WorkflowRepository>();
	return {
		service: new WorkflowImportMatchService(finder, workflowRepository),
		finder,
		workflowRepository,
	};
}

describe('WorkflowImportMatchService', () => {
	it('returns an empty map without hitting the finder when no source ids are requested', async () => {
		const { service, finder } = makeService([]);

		const result = await service.findBySourceWorkflowIds('project-1', []);

		expect(result.size).toBe(0);
		expect(finder.findOwnedWorkflowsBySourceWorkflowIds).not.toHaveBeenCalled();
	});

	it('passes the project, source ids, and relation options through to the finder', async () => {
		const { service, finder } = makeService([]);

		await service.findBySourceWorkflowIds('project-1', ['wf-a', 'wf-b']);

		expect(finder.findOwnedWorkflowsBySourceWorkflowIds).toHaveBeenCalledWith(
			'project-1',
			['wf-a', 'wf-b'],
			{ includeActiveVersion: true, includeParentFolder: true },
		);
	});

	it('keys an imported workflow by its sourceWorkflowId', async () => {
		const imported = workflow({ id: 'local-1', sourceWorkflowId: 'wf-source' });
		const { service } = makeService([imported]);

		const result = await service.findBySourceWorkflowIds('project-1', ['wf-source']);

		expect(result.get('wf-source')).toBe(imported);
		expect(result.has('local-1')).toBe(false);
	});

	it('prefers sourceWorkflowId over id so a foreign id collision is not a match', async () => {
		// Local id 'wf-source' collides with a package id, but the workflow's real
		// identity is its sourceWorkflowId 'other-source', so it keys there only.
		const imported = workflow({ id: 'wf-source', sourceWorkflowId: 'other-source' });
		const { service } = makeService([imported]);

		const result = await service.findBySourceWorkflowIds('project-1', [
			'wf-source',
			'other-source',
		]);

		expect(result.has('wf-source')).toBe(false);
		expect(result.get('other-source')).toBe(imported);
	});

	it('fails fast when two workflows share the same sourceWorkflowId', async () => {
		const first = workflow({ id: 'local-1', sourceWorkflowId: 'wf-dup', name: 'First' });
		const second = workflow({ id: 'local-2', sourceWorkflowId: 'wf-dup', name: 'Second' });
		const { service } = makeService([first, second]);

		await expect(service.findBySourceWorkflowIds('project-1', ['wf-dup'])).rejects.toMatchObject({
			message: 'Multiple workflows in the target project share the same sourceWorkflowId',
			extra: { projectId: 'project-1', sourceWorkflowId: 'wf-dup' },
		});
	});

	it('keeps distinct source ids in separate map entries', async () => {
		const a = workflow({ id: 'local-a', sourceWorkflowId: 'wf-a' });
		const b = workflow({ id: 'wf-b', sourceWorkflowId: 'wf-b' });
		const { service } = makeService([a, b]);

		const result = await service.findBySourceWorkflowIds('project-1', ['wf-a', 'wf-b']);

		expect(result.size).toBe(2);
		expect(result.get('wf-a')).toBe(a);
		expect(result.get('wf-b')).toBe(b);
	});

	it('falls back to local id when no sourceWorkflowId match exists', async () => {
		const authored = workflow({ id: 'wf-authored', sourceWorkflowId: null });
		const { service } = makeService([authored]);

		const result = await service.findBySourceWorkflowIds('project-1', ['wf-authored']);

		expect(result.get('wf-authored')).toBe(authored);
	});

	it('resolves mixed package ids from a single finder response', async () => {
		const imported = workflow({ id: 'local-1', sourceWorkflowId: 'wf-imported' });
		const authored = workflow({ id: 'wf-authored', sourceWorkflowId: null });
		const { service } = makeService([imported, authored]);

		const result = await service.findBySourceWorkflowIds('project-1', [
			'wf-imported',
			'wf-authored',
		]);

		expect(result.size).toBe(2);
		expect(result.get('wf-imported')).toBe(imported);
		expect(result.get('wf-authored')).toBe(authored);
	});

	describe('findOwningProjectsByWorkflowId', () => {
		it('returns an empty map without querying when no ids are requested', async () => {
			const { service, workflowRepository } = makeService();

			const result = await service.findOwningProjectsByWorkflowId([]);

			expect(result.size).toBe(0);
			expect(workflowRepository.findPreExistingWorkflows).not.toHaveBeenCalled();
		});

		it('maps each existing workflow id to its owning project, name, and archived state', async () => {
			const { service, workflowRepository } = makeService();
			workflowRepository.findPreExistingWorkflows.mockResolvedValue([
				workflow({ id: 'STILTON', name: 'Stilton', ownerProjectId: 'project-1' }),
				workflow({ id: 'BRIE', name: 'Brie', ownerProjectId: 'project-2', isArchived: true }),
			]);

			const result = await service.findOwningProjectsByWorkflowId(['STILTON', 'BRIE']);

			expect(result.get('STILTON')).toEqual({
				projectId: 'project-1',
				name: 'Stilton',
				isArchived: false,
			});
			expect(result.get('BRIE')).toEqual({
				projectId: 'project-2',
				name: 'Brie',
				isArchived: true,
			});
		});

		it('reports a workflow without an owner share with a null projectId', async () => {
			// The id is still occupied even when no owner share exists (orphaned row).
			const { service, workflowRepository } = makeService();
			workflowRepository.findPreExistingWorkflows.mockResolvedValue([
				workflow({ id: 'ORPHAN', name: 'Orphan', ownerProjectId: null }),
			]);

			const result = await service.findOwningProjectsByWorkflowId(['ORPHAN']);

			expect(result.get('ORPHAN')).toEqual({
				projectId: null,
				name: 'Orphan',
				isArchived: false,
			});
		});

		it('omits ids that do not exist anywhere', async () => {
			const { service, workflowRepository } = makeService();
			workflowRepository.findPreExistingWorkflows.mockResolvedValue([]);

			const result = await service.findOwningProjectsByWorkflowId(['GHOST']);

			expect(result.has('GHOST')).toBe(false);
		});
	});
});
