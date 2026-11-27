import type {
	PromotionDependencyWarning,
	PromotionMissingDependency,
	PromotionPreviewCheck,
} from '@n8n/api-types';

import { previewRevision, promoteCheckRevision } from '../promotion-preview';

const consumers = [
	{ project: { id: 'A', name: 'Alpha' }, workflows: [{ id: 'wf', name: 'Sync' }] },
];
const missing: PromotionMissingDependency = {
	kind: 'credential',
	id: 'C',
	name: 'CRM key',
	credentialType: 'httpHeaderAuth',
	group: 'other-project',
	reason: 'not-on-branch',
	accessible: true,
	blocking: false,
	consumers,
};
const warning: PromotionDependencyWarning = {
	kind: 'workflow',
	code: 'missing-on-source',
	id: 'sub',
	name: 'sub',
	blocking: false,
	consumers,
};

describe('previewRevision', () => {
	const shown = { resources: [], missingDependencies: [missing], warnings: [warning] };

	it('stays equal when the dependency lists stay equal', () => {
		expect(previewRevision({ ...shown, missingDependencies: [{ ...missing }] })).toBe(
			previewRevision(shown),
		);
	});

	it.each([
		['a missing dependency leaves the list', { missingDependencies: [] }],
		[
			'a missing dependency changes its group',
			{
				missingDependencies: [{ ...missing, group: 'outside-access' as const, accessible: false }],
			},
		],
		[
			'a missing dependency names another project',
			{ missingDependencies: [{ ...missing, project: { id: 'B', name: 'Beta' } }] },
		],
		['a warning leaves the list', { warnings: [] }],
	])('changes when %s', (_case, change) => {
		expect(previewRevision({ ...shown, ...change })).not.toBe(previewRevision(shown));
	});
});

describe('previewRevision of an Apply preview', () => {
	const notUsable: PromotionMissingDependency = {
		...missing,
		group: 'outside-access',
		reason: 'not-on-instance',
		accessible: false,
		blocking: true,
	};
	const check = (missingDependencies: PromotionMissingDependency[]): PromotionPreviewCheck => ({
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		missingDependencies,
		movedWorkflows: [],
		movedFolders: [],
	});
	const revisionOf = (missingDependencies: PromotionMissingDependency[]) =>
		previewRevision({ resources: [], check: check(missingDependencies) });

	it('stays equal when the missing dependencies of the check stay equal', () => {
		expect(revisionOf([{ ...notUsable }])).toBe(revisionOf([notUsable]));
	});

	it.each([
		['a missing dependency leaves the check', []],
		['a missing dependency changes its reason', [{ ...notUsable, reason: 'not-shared' as const }]],
		[
			'a missing dependency changes its group',
			[{ ...notUsable, group: 'needs-action' as const, accessible: true }],
		],
	])('changes when %s', (_case, missingDependencies) => {
		expect(revisionOf(missingDependencies)).not.toBe(revisionOf([notUsable]));
	});
});

describe('promoteCheckRevision', () => {
	const shown = { missingDependencies: [missing], warnings: [warning] };

	it('stays equal when the lists stay equal', () => {
		expect(
			promoteCheckRevision({ missingDependencies: [{ ...missing }], warnings: [warning] }),
		).toBe(promoteCheckRevision(shown));
	});

	it('changes when a list changes', () => {
		expect(promoteCheckRevision({ ...shown, warnings: [] })).not.toBe(promoteCheckRevision(shown));
		expect(
			promoteCheckRevision({ ...shown, missingDependencies: [{ ...missing, blocking: true }] }),
		).not.toBe(promoteCheckRevision(shown));
	});
});
