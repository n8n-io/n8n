import type { Folder, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { FolderFinderService } from '@/services/folder-finder.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import type { WorkflowExporter } from '../../workflow/workflow.exporter';
import { FolderExporter } from '../folder.exporter';
import { FolderSerializer } from '../folder.serializer';

const user = mock<User>({ id: 'user-1' });

function makeFolder(overrides: Partial<Folder> = {}): Folder {
	return {
		id: 'fld-1',
		name: 'to_production',
		parentFolderId: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides,
	} as unknown as Folder;
}

function makeExporter(found: Folder[]) {
	const finder = mock<FolderFinderService>();
	finder.findFolderSubtreesForUser.mockResolvedValue(found);
	const workflowFinder = mock<WorkflowFinderService>();
	workflowFinder.findWorkflowIdsByFolder.mockResolvedValue(new Map());
	const workflowExporter = mock<WorkflowExporter>();
	const exporter = new FolderExporter(
		finder,
		new FolderSerializer(),
		workflowFinder,
		workflowExporter,
	);
	return { exporter, workflowFinder, workflowExporter };
}

// The folder-shell behaviour (nesting, re-rooting, sibling ordering, access
// control) is proven end-to-end in export-folder.integration.test.ts. Left here
// are the seams that suite can't reach cheaply: `basePrefix` (used by a future
// ProjectExporter, LIGO-685) and the contained-workflow wiring — delegation to
// WorkflowExporter, aggregation of its output, and abort propagation.
describe('FolderExporter', () => {
	it('honors basePrefix so the tree composes under a project namespace', async () => {
		const { exporter } = makeExporter([makeFolder()]);

		const { entries } = await exporter.export({
			user,
			folderIds: ['fld-1'],
			writer: new CapturingWriter(),
			basePrefix: 'projects/team-ligo',
		});

		expect(entries[0].target).toMatch(/^projects\/team-ligo\/folders\//);
	});

	it('delegates contained workflows to WorkflowExporter and aggregates its output', async () => {
		const { exporter, workflowFinder, workflowExporter } = makeExporter([makeFolder()]);
		workflowFinder.findWorkflowIdsByFolder.mockResolvedValue(new Map([['fld-1', ['w1']]]));
		workflowExporter.export.mockResolvedValue({
			entries: [{ id: 'w1', name: 'W1', target: 'folders/toproduction/workflows/w1' }],
			requirements: {
				credentials: [
					{
						workflowId: 'w1',
						credentialId: 'c1',
						credentialName: 'Cred',
						credentialType: 'httpHeaderAuth',
					},
				],
				dataTables: [],
			},
		});

		const result = await exporter.export({
			user,
			folderIds: ['fld-1'],
			writer: new CapturingWriter(),
		});

		// The folder's own target is passed as basePrefix, so workflows nest under it.
		expect(workflowExporter.export).toHaveBeenCalledWith(
			expect.objectContaining({ user, workflowIds: ['w1'], basePrefix: 'folders/toproduction' }),
		);
		expect(result.workflowEntries).toEqual([
			{ id: 'w1', name: 'W1', target: 'folders/toproduction/workflows/w1' },
		]);
		expect(result.requirements.credentials).toEqual([
			{
				workflowId: 'w1',
				credentialId: 'c1',
				credentialName: 'Cred',
				credentialType: 'httpHeaderAuth',
			},
		]);
	});

	it('propagates a WorkflowExporter abort so the whole folder export rejects', async () => {
		const { exporter, workflowFinder, workflowExporter } = makeExporter([makeFolder()]);
		workflowFinder.findWorkflowIdsByFolder.mockResolvedValue(new Map([['fld-1', ['w1']]]));
		workflowExporter.export.mockRejectedValue(
			new Error('1 workflow(s) not found or not accessible. Export aborted.'),
		);

		await expect(
			exporter.export({ user, folderIds: ['fld-1'], writer: new CapturingWriter() }),
		).rejects.toThrow(/not found or not accessible/);
	});
});
