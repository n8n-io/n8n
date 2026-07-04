import type { FolderRepository, SharedWorkflow, SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { WorkflowFinderService } from '../workflow-finder.service';

/** Minimal projection of the row shape `findWorkflowIdsByFolder` selects. */
type FolderRow = { workflow: { id: string; parentFolder: { id: string } | null } };

function makeService(rows?: FolderRow[]) {
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	if (rows) {
		sharedWorkflowRepository.find.mockResolvedValue(rows as unknown as SharedWorkflow[]);
	}
	const service = new WorkflowFinderService(
		sharedWorkflowRepository,
		mock<FolderRepository>(),
		mock<RoleService>(),
	);
	return { service, sharedWorkflowRepository };
}

describe('WorkflowFinderService', () => {
	describe('findWorkflowIdsByFolder', () => {
		it('returns an empty map without querying when no folder ids are given', async () => {
			const { service, sharedWorkflowRepository } = makeService();

			const result = await service.findWorkflowIdsByFolder([]);

			expect(result.size).toBe(0);
			expect(sharedWorkflowRepository.find).not.toHaveBeenCalled();
		});

		it('groups workflow ids by their parent folder', async () => {
			const { service } = makeService([
				{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
				{ workflow: { id: 'w2', parentFolder: { id: 'f1' } } },
				{ workflow: { id: 'w3', parentFolder: { id: 'f2' } } },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1', 'f2']);

			expect(result.get('f1')).toEqual(['w1', 'w2']);
			expect(result.get('f2')).toEqual(['w3']);
		});

		it('dedupes a workflow that surfaces via several share rows', async () => {
			const { service } = makeService([
				{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
				{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1']);

			expect(result.get('f1')).toEqual(['w1']);
		});

		it('skips rows whose workflow has no parent folder', async () => {
			const { service } = makeService([
				{ workflow: { id: 'w1', parentFolder: null } },
				{ workflow: { id: 'w2', parentFolder: { id: 'f1' } } },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1']);

			expect([...result.keys()]).toEqual(['f1']);
			expect(result.get('f1')).toEqual(['w2']);
		});
	});
});
