import { ConflictError, UnprocessableRequestError } from '@n8n/errors';

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
	usedBy: [{ kind: 'workflow', id: 'w1' }],
};

const variableUnresolved: BlockingIssue = {
	type: 'variable-unresolved',
	name: 'API_URL',
	usedBy: [{ kind: 'workflow', id: 'w1' }],
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

const agentConflict: BlockingIssue = {
	type: 'agent-conflict',
	kind: 'existing',
	sourceAgentId: 'source-agent-1',
	projectId: 'project-1',
	targetIds: ['target-agent-1'],
};

const credentialPolicyViolation: BlockingIssue = {
	type: 'credential-policy-violation',
	sourceId: 'c1',
	name: 'Prod GitHub',
	credentialType: 'githubApi',
	usedBy: [{ kind: 'workflow', id: 'w1' }],
	violations: [{ kind: 'test-denial', checkId: 'test.check', message: 'Not allowed' }],
};

const tagUnresolved = (
	kind: 'rename-drift' | 'name-collision' | 'invalid-name',
): BlockingIssue => ({
	type: 'tag-unresolved',
	kind,
	sourceId: 't1',
	name: 'prod',
	usedBy: [{ kind: 'workflow', id: 'w1' }],
});

const credentialConflict = (kind: 'differs' | 'divergent'): BlockingIssue => ({
	type: 'credential-conflict',
	kind,
	targetId: 'c1',
	sourceIds: ['s1'],
	name: 'GitHub',
	usedBy: [{ kind: 'workflow', id: 'w1' }],
});

describe('toImportBlockedError', () => {
	it.each(['differs', 'divergent'] as const)(
		'maps a %s credential-conflict to 409 Conflict',
		(kind) => {
			const error = toImportBlockedError([credentialConflict(kind), credentialUnresolved]);
			expect(error).toBeInstanceOf(ConflictError);
		},
	);

	it.each([folderConflict, projectConflict, workflowLineageConflict, agentConflict])(
		'maps $type to 409 Conflict',
		(issue) => {
			const error = toImportBlockedError([issue]);
			expect(error).toBeInstanceOf(ConflictError);
		},
	);

	it('still maps credential-only blocks to 422', () => {
		const error = toImportBlockedError([credentialUnresolved]);
		expect(error).toBeInstanceOf(UnprocessableRequestError);
	});

	it('maps a credential-policy-violation to 422', () => {
		const error = toImportBlockedError([credentialPolicyViolation]);
		expect(error).toBeInstanceOf(UnprocessableRequestError);
	});

	it('maps a credential-update-forbidden to 422', () => {
		const error = toImportBlockedError([
			{
				type: 'credential-update-forbidden',
				targetId: 'c1',
				sourceIds: ['s1'],
				name: 'GitHub',
				usedBy: [{ kind: 'workflow', id: 'w1' }],
			},
		]);
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
