import {
	decideMatchedFolder,
	folderPolicyRejection,
	removesUnpackagedWorkflows,
	resolveFolderConflictPolicy,
} from '../folder-conflict-policy';

describe('decideMatchedFolder', () => {
	it('does not block under merge', () => {
		expect(decideMatchedFolder('merge')).toEqual({ blocked: false });
	});

	it('blocks under fail', () => {
		expect(decideMatchedFolder('fail')).toEqual({ blocked: true });
	});

	it('does not block under overwrite, which reuses matched folders like merge', () => {
		expect(decideMatchedFolder('overwrite')).toEqual({ blocked: false });
	});
});

describe('removesUnpackagedWorkflows', () => {
	it('prunes only under overwrite', () => {
		expect(removesUnpackagedWorkflows('overwrite')).toBe(true);
		expect(removesUnpackagedWorkflows('merge')).toBe(false);
		expect(removesUnpackagedWorkflows('fail')).toBe(false);
	});
});

describe('resolveFolderConflictPolicy', () => {
	const request = (folderConflictPolicy?: 'merge' | 'fail' | 'overwrite') => ({
		projectConflictPolicy: 'overwrite' as const,
		overwriteDeletionPolicy: 'archive' as const,
		folderConflictPolicy,
	});

	it('keeps an explicit folder policy', () => {
		expect(resolveFolderConflictPolicy(request('fail'), 'project')).toBe('fail');
	});

	it('inherits the project policy on a project package when omitted', () => {
		expect(resolveFolderConflictPolicy(request(), 'project')).toBe('overwrite');
	});

	it('falls back to merge on a workflow package, whose project policy is meaningless', () => {
		expect(resolveFolderConflictPolicy(request(), 'workflow')).toBe('merge');
	});
});

describe('folderPolicyRejection', () => {
	const request = (input: {
		folderConflictPolicy?: 'merge' | 'fail' | 'overwrite';
		projectConflictPolicy: 'merge' | 'fail' | 'overwrite';
	}) => ({ ...input, overwriteDeletionPolicy: 'archive' as const });

	it('rejects an explicit overwrite mismatch on a project package', () => {
		expect(
			folderPolicyRejection(
				request({ folderConflictPolicy: 'overwrite', projectConflictPolicy: 'merge' }),
				'project',
			),
		).toMatch(/requires projectConflictPolicy=overwrite/);
	});

	it('allows overwrite on a project package when both policies say so', () => {
		expect(
			folderPolicyRejection(
				request({ folderConflictPolicy: 'overwrite', projectConflictPolicy: 'overwrite' }),
				'project',
			),
		).toBeUndefined();
	});

	it('does not reject an omitted folder policy, which inherits the project policy', () => {
		expect(
			folderPolicyRejection(request({ projectConflictPolicy: 'merge' }), 'project'),
		).toBeUndefined();
	});

	it('rejects overwrite on a workflow package, which cannot describe the whole scope', () => {
		expect(
			folderPolicyRejection(
				request({ folderConflictPolicy: 'overwrite', projectConflictPolicy: 'merge' }),
				'workflow',
			),
		).toMatch(/only supported for project packages/);
	});
});
