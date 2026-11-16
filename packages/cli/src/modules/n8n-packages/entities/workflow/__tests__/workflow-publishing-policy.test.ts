import type { WorkflowEntity } from '@n8n/db';

import type { WorkflowImportDecision } from '../workflow-import.types';
import {
	decidePlannedPublishingAction,
	decideWorkflowPublishingAction,
} from '../workflow-publishing-policy';
import { WorkflowPublishingPolicy } from '../workflow-publishing-policy.types';

describe('decideWorkflowPublishingAction', () => {
	it.each([
		{
			policy: WorkflowPublishingPolicy.PreservePublishedState,
			status: 'created' as const,
			sourcePublished: true,
			currentlyPublished: false,
			expected: 'noop',
		},
		{
			policy: WorkflowPublishingPolicy.PreservePublishedState,
			status: 'updated' as const,
			sourcePublished: true,
			currentlyPublished: true,
			expected: 'publish',
		},
		{
			// A draft source should not be published, even when the target is currently published.
			policy: WorkflowPublishingPolicy.PreservePublishedState,
			status: 'updated' as const,
			sourcePublished: false,
			currentlyPublished: true,
			expected: 'noop',
		},
		{
			policy: WorkflowPublishingPolicy.MatchSource,
			status: 'created' as const,
			sourcePublished: true,
			currentlyPublished: false,
			expected: 'publish',
		},
		{
			policy: WorkflowPublishingPolicy.MatchSource,
			status: 'updated' as const,
			sourcePublished: false,
			currentlyPublished: true,
			expected: 'unpublish',
		},
		{
			policy: WorkflowPublishingPolicy.PublishAll,
			status: 'created' as const,
			sourcePublished: false,
			currentlyPublished: false,
			expected: 'publish',
		},
		{
			policy: WorkflowPublishingPolicy.UnpublishAll,
			status: 'updated' as const,
			sourcePublished: true,
			currentlyPublished: true,
			expected: 'unpublish',
		},
	])('$policy + $status → $expected', (testCase) => {
		expect(
			decideWorkflowPublishingAction(testCase.policy, {
				status: testCase.status,
				sourcePublished: testCase.sourcePublished,
				currentlyPublished: testCase.currentlyPublished,
				isArchived: false,
			}),
		).toBe(testCase.expected);
	});

	it.each(
		[true, false, undefined].flatMap((sourcePublished) =>
			(['created', 'updated'] as const).flatMap((status) =>
				[true, false].map((currentlyPublished) => ({
					sourcePublished,
					status,
					currentlyPublished,
				})),
			),
		),
	)(
		'PreserveTargetState leaves a $status workflow alone (source published: $sourcePublished, target published: $currentlyPublished)',
		({ sourcePublished, status, currentlyPublished }) => {
			expect(
				decideWorkflowPublishingAction(WorkflowPublishingPolicy.PreserveTargetState, {
					status,
					sourcePublished,
					currentlyPublished,
					isArchived: false,
				}),
			).toBe('noop');
		},
	);

	it('returns noop for skipped imports regardless of policy', () => {
		expect(
			decideWorkflowPublishingAction(WorkflowPublishingPolicy.PublishAll, {
				status: 'skipped',
				sourcePublished: true,
				currentlyPublished: true,
				isArchived: false,
			}),
		).toBe('noop');
	});

	it('unpublishes archived workflows that were published', () => {
		expect(
			decideWorkflowPublishingAction(WorkflowPublishingPolicy.PublishAll, {
				status: 'updated',
				sourcePublished: true,
				currentlyPublished: true,
				isArchived: true,
			}),
		).toBe('unpublish');
	});

	it('still unpublishes archived workflows under PreserveTargetState', () => {
		expect(
			decideWorkflowPublishingAction(WorkflowPublishingPolicy.PreserveTargetState, {
				status: 'updated',
				sourcePublished: false,
				currentlyPublished: true,
				isArchived: true,
			}),
		).toBe('unpublish');
	});

	describe('when the package states no publish opinion', () => {
		it.each([
			WorkflowPublishingPolicy.MatchSource,
			WorkflowPublishingPolicy.PreservePublishedState,
		])('leaves a published target published under %s', (policy) => {
			expect(
				decideWorkflowPublishingAction(policy, {
					status: 'updated',
					sourcePublished: undefined,
					currentlyPublished: true,
					isArchived: false,
				}),
			).toBe('noop');
		});

		it.each([
			WorkflowPublishingPolicy.MatchSource,
			WorkflowPublishingPolicy.PreservePublishedState,
		])('leaves a created workflow unpublished under %s', (policy) => {
			expect(
				decideWorkflowPublishingAction(policy, {
					status: 'created',
					sourcePublished: undefined,
					currentlyPublished: false,
					isArchived: false,
				}),
			).toBe('noop');
		});

		it('still honours an explicit publish-all, which asks for no source state', () => {
			expect(
				decideWorkflowPublishingAction(WorkflowPublishingPolicy.PublishAll, {
					status: 'created',
					sourcePublished: undefined,
					currentlyPublished: false,
					isArchived: false,
				}),
			).toBe('publish');
		});
	});
});

describe('decidePlannedPublishingAction', () => {
	const entity = { id: 'workflow-1', name: 'Workflow' } as WorkflowEntity;
	const prepared = { entity, sourceWorkflowId: 'source-1', parentFolderId: null };

	function update(
		targetPublished: boolean,
		overrides: { sourcePublished?: boolean; sourceArchived?: boolean } = {},
	): WorkflowImportDecision {
		const existing = {
			...entity,
			activeVersionId: targetPublished ? 'version-1' : null,
		} as WorkflowEntity;
		return {
			...prepared,
			sourceArchived: false,
			...overrides,
			action: 'update',
			existing,
			archiveTransition: overrides.sourceArchived ? 'archive' : null,
		};
	}

	it('reads the published state of an update from the existing workflow', () => {
		const policy = WorkflowPublishingPolicy.PreservePublishedState;
		expect(decidePlannedPublishingAction(policy, update(true, { sourcePublished: true }))).toBe(
			'publish',
		);
		expect(decidePlannedPublishingAction(policy, update(false, { sourcePublished: true }))).toBe(
			'noop',
		);
	});

	it('treats a created workflow as unpublished', () => {
		const created: WorkflowImportDecision = {
			...prepared,
			sourcePublished: true,
			sourceArchived: false,
			action: 'create',
			decidedId: 'workflow-1',
		};
		expect(decidePlannedPublishingAction(WorkflowPublishingPolicy.MatchSource, created)).toBe(
			'publish',
		);
		expect(decidePlannedPublishingAction(WorkflowPublishingPolicy.UnpublishAll, created)).toBe(
			'noop',
		);
	});

	it.each([WorkflowPublishingPolicy.PublishAll, WorkflowPublishingPolicy.UnpublishAll])(
		'returns noop for an archived workflow under %s, even when the target is published',
		(policy) => {
			expect(decidePlannedPublishingAction(policy, update(true, { sourceArchived: true }))).toBe(
				'noop',
			);
		},
	);

	it('returns noop for a skipped workflow', () => {
		const existing = { ...entity, activeVersionId: 'version-1' } as WorkflowEntity;
		const skipped: WorkflowImportDecision = {
			...prepared,
			sourcePublished: true,
			sourceArchived: false,
			action: 'skip',
			existing,
		};
		expect(decidePlannedPublishingAction(WorkflowPublishingPolicy.PublishAll, skipped)).toBe(
			'noop',
		);
	});

	// Planning uses the policy matrix for workflows that need no archive step.
	it.each(
		Object.values(WorkflowPublishingPolicy).flatMap((policy) =>
			[true, false, undefined].flatMap((sourcePublished) => [
				{ policy, sourcePublished, action: 'create' as const, targetPublished: false },
				{ policy, sourcePublished, action: 'update' as const, targetPublished: false },
				{ policy, sourcePublished, action: 'update' as const, targetPublished: true },
			]),
		),
	)(
		'matches the policy for $action under $policy (source published: $sourcePublished, target published: $targetPublished)',
		({ policy, sourcePublished, action, targetPublished }) => {
			const item: WorkflowImportDecision =
				action === 'create'
					? { ...prepared, sourcePublished, sourceArchived: false, action, decidedId: 'workflow-1' }
					: update(targetPublished, { sourcePublished });

			expect(decidePlannedPublishingAction(policy, item)).toBe(
				decideWorkflowPublishingAction(policy, {
					status: action === 'create' ? 'created' : 'updated',
					sourcePublished,
					currentlyPublished: targetPublished,
					isArchived: false,
				}),
			);
		},
	);
});
