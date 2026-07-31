import { contestedReconcileTargetFailures } from '../tag.types';
import type { TagImportPlan } from '../tag.types';

const emptyPlan: TagImportPlan = {
	matched: [],
	creations: [],
	renames: [],
	reconciles: [],
	dropped: [],
	failures: [],
};

describe('contestedReconcileTargetFailures', () => {
	describe('name collision across package tags (e.g. a tag manually created on the target)', () => {
		it('blocks two package tags that would both adopt the same manually-created tag', () => {
			const scope = {
				tagPlan: {
					...emptyPlan,
					reconciles: [
						{ id: 'tag-a', name: 'prod', oldId: 'holder' },
						{ id: 'tag-b', name: 'prod', oldId: 'holder' },
					],
				},
				workflows: [
					{ sourceWorkflowId: 'wf-1', tagIds: ['tag-a'] },
					{ sourceWorkflowId: 'wf-2', tagIds: ['tag-b'] },
				],
			};

			expect(contestedReconcileTargetFailures([scope])).toEqual([
				{
					kind: 'name-collision',
					sourceId: 'tag-a',
					name: 'prod',
					existingTagId: 'holder',
					usedByWorkflows: ['wf-1'],
				},
				{
					kind: 'name-collision',
					sourceId: 'tag-b',
					name: 'prod',
					existingTagId: 'holder',
					usedByWorkflows: ['wf-2'],
				},
			]);
		});

		it('blocks adopting a manually-created tag that another package tag already matches by id', () => {
			const scope = {
				tagPlan: {
					...emptyPlan,
					matched: [{ id: 'holder', name: 'prod' }],
					reconciles: [{ id: 'tag-x', name: 'prod', oldId: 'holder' }],
				},
				workflows: [{ sourceWorkflowId: 'wf-1', tagIds: ['tag-x'] }],
			};

			expect(contestedReconcileTargetFailures([scope])).toEqual([
				{
					kind: 'name-collision',
					sourceId: 'tag-x',
					name: 'prod',
					existingTagId: 'holder',
					usedByWorkflows: ['wf-1'],
				},
			]);
		});

		it('blocks adopting a manually-created tag that another package tag would rename instead', () => {
			const scope = {
				tagPlan: {
					...emptyPlan,
					renames: [{ id: 'holder', from: 'prod', to: 'staging' }],
					reconciles: [{ id: 'tag-x', name: 'prod', oldId: 'holder' }],
				},
				workflows: [{ sourceWorkflowId: 'wf-1', tagIds: ['tag-x'] }],
			};

			expect(contestedReconcileTargetFailures([scope])).toEqual([
				{
					kind: 'name-collision',
					sourceId: 'tag-x',
					name: 'prod',
					existingTagId: 'holder',
					usedByWorkflows: ['wf-1'],
				},
			]);
		});

		it('allows the same tag adoption to repeat across scopes without conflict', () => {
			const reconcile = { id: 'tag-x', name: 'prod', oldId: 'holder' };
			const scopeA = {
				tagPlan: { ...emptyPlan, reconciles: [reconcile] },
				workflows: [{ sourceWorkflowId: 'wf-1', tagIds: ['tag-x'] }],
			};
			const scopeB = {
				tagPlan: { ...emptyPlan, reconciles: [reconcile] },
				workflows: [{ sourceWorkflowId: 'wf-2', tagIds: ['tag-x'] }],
			};

			expect(contestedReconcileTargetFailures([scopeA, scopeB])).toEqual([]);
		});
	});
});
