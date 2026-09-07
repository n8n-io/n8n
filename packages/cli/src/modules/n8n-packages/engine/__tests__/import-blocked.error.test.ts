import { ConflictError } from '@/errors/response-errors/conflict.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type { BlockingIssue } from '../../n8n-packages.types';
import { toImportBlockedError } from '../import-blocked.error';

const folderConflict: BlockingIssue = {
	type: 'folder-conflict',
	kind: 'parent-mismatch',
	sourceFolderId: 'f1',
	name: 'in_progress',
	existingParentFolderId: null,
	expectedParentFolderId: 'anchor',
};

const projectConflict: BlockingIssue = {
	type: 'project-conflict',
	kind: 'fail-policy',
	sourceProjectId: 'p1',
	name: 'billing',
};

const credentialUnresolved: BlockingIssue = {
	type: 'credential-unresolved',
	kind: 'not_found',
	sourceId: 'c1',
	usedByWorkflows: ['w1'],
};

const variableUnresolved: BlockingIssue = {
	type: 'variable-unresolved',
	name: 'API_URL',
	usedByWorkflows: ['w1'],
};

const workflowLineageConflict: BlockingIssue = {
	type: 'workflow-lineage-conflict',
	sourceWorkflowId: 'source-1',
	projectId: 'project-1',
	existingWorkflows: [
		{ id: 'workflow-1', name: 'First', isArchived: false },
		{ id: 'workflow-2', name: 'Second', isArchived: false },
	],
};

const tagUnresolved = (
	kind: 'rename-drift' | 'name-collision' | 'invalid-name',
): BlockingIssue => ({
	type: 'tag-unresolved',
	kind,
	sourceId: 't1',
	name: 'prod',
	usedByWorkflows: ['w1'],
});

describe('toImportBlockedError', () => {
	it('maps a folder-conflict to 409 Conflict', () => {
		const error = toImportBlockedError([folderConflict]);
		expect(error).toBeInstanceOf(ConflictError);
	});

	it('maps a project-conflict to 409 Conflict', () => {
		const error = toImportBlockedError([projectConflict]);
		expect(error).toBeInstanceOf(ConflictError);
	});

	it('maps a workflow-lineage-conflict to 409 Conflict', () => {
		const error = toImportBlockedError([workflowLineageConflict]);
		expect(error).toBeInstanceOf(ConflictError);
	});

	it('still maps credential-only blocks to 422', () => {
		const error = toImportBlockedError([credentialUnresolved]);
		expect(error).toBeInstanceOf(UnprocessableRequestError);
	});

	it('maps variable-only blocks to 422', () => {
		const error = toImportBlockedError([variableUnresolved]);
		expect(error).toBeInstanceOf(UnprocessableRequestError);
	});

	it('prefers 409 when a folder-conflict is mixed with credential issues', () => {
		const error = toImportBlockedError([credentialUnresolved, folderConflict]);
		expect(error).toBeInstanceOf(ConflictError);
	});

	it.each(['rename-drift', 'name-collision'] as const)('maps a tag %s to 409 Conflict', (kind) => {
		expect(toImportBlockedError([tagUnresolved(kind)])).toBeInstanceOf(ConflictError);
	});

	it('maps an invalid tag name to 422', () => {
		expect(toImportBlockedError([tagUnresolved('invalid-name')])).toBeInstanceOf(
			UnprocessableRequestError,
		);
	});
});
