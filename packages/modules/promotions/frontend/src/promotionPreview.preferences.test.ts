import type { PromotionResourceDetail } from '@n8n/api-types';
import { describeFieldChanges } from './promotionPreview.content';
import { buildSelectionGraph } from './promotionPreview.selection';
import { indexBlockers, listBlockers, toOperationRequest } from './promotionOperation';
import { resource } from './__tests__/preview.fixtures';
import type { ApplyCheckResult } from './promotions.types';

const preference = resource({
	key: 'preference:p1',
	id: 'p1',
	name: 'Preference',
	type: 'preference',
	parentKey: 'project:project-1',
	change: 'modified',
	selectable: true,
});

it('sends only explicitly selected Preferences', () => {
	const graph = buildSelectionGraph(
		{
			resources: [preference, resource({ ...preference, key: 'preference:p2', id: 'p2' })],
			dependencies: [],
		},
		'apply',
	);
	expect(toOperationRequest(graph, new Set([preference.key]))).toMatchObject({
		preferenceIds: ['p1'],
		workflowIds: [],
	});
	expect(toOperationRequest(graph, new Set())).not.toHaveProperty('preferenceIds');
});

it('shows the current and incoming instruction text without rewriting it', () => {
	const detail: PromotionResourceDetail = {
		key: preference.key,
		type: 'preference',
		before: { id: 'p1', scope: 'project', content: 'Use UTC.\nKeep names.' },
		after: { id: 'p1', scope: 'project', content: 'Use local time.\nKeep names.' },
		revision: preference.revision,
	};
	expect(
		describeFieldChanges(detail, {
			direction: 'apply',
			resource: preference,
			containerName: () => 'Orders',
		}),
	).toEqual([{ field: 'content', before: detail.before?.content, after: detail.after?.content }]);
});

it('blocks the conflicting Preference without blocking other selections', () => {
	const check = {
		environmentId: 'env-1',
		git: { branchName: 'main', commitSha: 'a'.repeat(40) },
		missingBindings: [],
		missingProjects: [],
		accessRequirements: [],
		warnings: [],
		movedWorkflows: [],
		movedFolders: [],
		conflicts: [
			{
				kind: 'preference',
				code: 'preference-conflict',
				id: 'p1',
				message: 'The destination scope is full.',
			},
		],
	} satisfies ApplyCheckResult;
	const blocked = indexBlockers(listBlockers(check, ['preference:p1', 'preference:p2']));
	expect([...blocked.blocked]).toEqual(['preference:p1']);
});
