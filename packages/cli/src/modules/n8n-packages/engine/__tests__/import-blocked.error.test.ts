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

const credentialUnresolved: BlockingIssue = {
	type: 'credential-unresolved',
	kind: 'not_found',
	sourceId: 'c1',
	usedByWorkflows: ['w1'],
};

describe('toImportBlockedError', () => {
	it('maps a folder-conflict to 409 Conflict', () => {
		const error = toImportBlockedError([folderConflict]);
		expect(error).toBeInstanceOf(ConflictError);
	});

	it('still maps credential-only blocks to 422', () => {
		const error = toImportBlockedError([credentialUnresolved]);
		expect(error).toBeInstanceOf(UnprocessableRequestError);
	});

	it('prefers 409 when a folder-conflict is mixed with credential issues', () => {
		const error = toImportBlockedError([credentialUnresolved, folderConflict]);
		expect(error).toBeInstanceOf(ConflictError);
	});
});
