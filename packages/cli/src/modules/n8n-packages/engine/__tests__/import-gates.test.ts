import type { WorkflowEntity } from '@n8n/db';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { WorkflowImportPlan } from '../../entities/workflow/workflow-import.types';
import { assertArchiveTransitionsAllowed } from '../import-gates';

function workflowPlan(archiveTransition: 'archive' | 'unarchive' | null): WorkflowImportPlan {
	const workflow = { id: 'workflow-1', name: 'Workflow' } as WorkflowEntity;
	return {
		items: [
			{
				action: 'update',
				sourceWorkflowId: 'source-1',
				entity: workflow,
				existing: workflow,
				archiveTransition,
				parentFolderId: null,
				sourcePublished: false,
			},
		],
		conflicts: [],
		lineageConflicts: [],
		idConflicts: [],
		folderConflicts: [],
		archiveForbidden: [],
	};
}

describe('assertArchiveTransitionsAllowed', () => {
	it('requires workflow:delete for an API key that changes archived state', () => {
		expect(() =>
			assertArchiveTransitionsAllowed(['workflow:import'], [workflowPlan('archive')]),
		).toThrow(ForbiddenError);
	});

	it('allows an API key with workflow:delete', () => {
		expect(() =>
			assertArchiveTransitionsAllowed(
				['workflow:import', 'workflow:delete'],
				[workflowPlan('unarchive')],
			),
		).not.toThrow();
	});

	it('does not require workflow:delete when archived state stays the same', () => {
		expect(() =>
			assertArchiveTransitionsAllowed(['workflow:import'], [workflowPlan(null)]),
		).not.toThrow();
	});
});
