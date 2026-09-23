import type { ExecutionSummary } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';

import { SELF_HEALING_WORKFLOWS_EXPERIMENT } from '@/app/constants/experiments';

const mockGetVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		currentUser: { id: 'user-1', email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' },
		usersById: {
			'user-2': { id: 'user-2', email: 'sam@example.com', firstName: 'Sam', lastName: 'Lee' },
		},
	}),
}));

import { SELF_HEALING_ASSISTANT, isSelfHealingReviewId } from './selfHealing.constants';
import { SELF_HEALING_FIX_DURATION_MS } from './selfHealing.constants';
import { useSelfHealingStore } from './selfHealing.store';

const PROJECT_ID = 'project-1';

function failedExecution(overrides: Partial<ExecutionSummary> = {}): ExecutionSummary {
	return {
		id: '501',
		mode: 'trigger',
		status: 'error',
		createdAt: new Date('2026-09-16T08:00:00Z'),
		startedAt: new Date('2026-09-16T08:00:00Z'),
		stoppedAt: new Date('2026-09-16T08:00:02Z'),
		workflowId: 'wf-1',
		workflowName: 'Order sync',
		lastNodeExecuted: 'Post to Slack',
		...overrides,
	};
}

/** `startFix` resolves `null` under "diagnose"; these tests expect a review. */
async function expectReviewId(pending: Promise<string | null>): Promise<string> {
	const reviewId = await pending;
	if (reviewId === null) throw new Error('Expected startFix to create a review');
	return reviewId;
}

describe('useSelfHealingStore', () => {
	let store: ReturnType<typeof useSelfHealingStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockGetVariant.mockReset();
		mockGetVariant.mockReturnValue(SELF_HEALING_WORKFLOWS_EXPERIMENT.variant);
		store = useSelfHealingStore();
	});

	describe('isEnabled', () => {
		it.each([
			[SELF_HEALING_WORKFLOWS_EXPERIMENT.variant, true],
			[true, true],
			[SELF_HEALING_WORKFLOWS_EXPERIMENT.control, false],
			[undefined, false],
		])('reads variant %s as %s', (variant, expected) => {
			mockGetVariant.mockReturnValue(variant);
			expect(store.isEnabled).toBe(expected);
		});
	});

	describe('configurations', () => {
		it('gives every project one active default configuration', () => {
			const configs = store.getProjectConfigs(PROJECT_ID);

			expect(configs).toHaveLength(1);
			expect(configs[0]).toMatchObject({
				projectId: PROJECT_ID,
				autonomy: 'review',
				status: 'active',
				scope: 'all',
				notifyProjectMembers: true,
				reviewerIds: [],
			});
		});

		it('materializes the default before it edits it', () => {
			const [defaultConfig] = store.getProjectConfigs(PROJECT_ID);

			store.setConfigStatus(PROJECT_ID, defaultConfig.id, 'paused');

			expect(store.getProjectConfigs(PROJECT_ID)[0].status).toBe('paused');
			expect(store.getActiveConfig(PROJECT_ID)).toBeNull();
		});

		it('creates, updates and deletes configurations', () => {
			const created = store.createConfig(PROJECT_ID, {
				autonomy: 'deploy',
				scope: 'selected',
				selectedWorkflowIds: ['wf-9'],
				customInstructions: '',
				notifyProjectMembers: false,
				reviewerIds: ['user-2'],
				status: 'active',
			});
			expect(store.getProjectConfigs(PROJECT_ID)).toHaveLength(2);

			store.updateConfig(PROJECT_ID, created.id, { customInstructions: 'Retry twice.' });
			expect(
				store.getProjectConfigs(PROJECT_ID).find((config) => config.id === created.id)
					?.customInstructions,
			).toBe('Retry twice.');

			store.deleteConfig(PROJECT_ID, created.id);
			expect(store.getProjectConfigs(PROJECT_ID)).toHaveLength(1);
		});
	});

	describe('getWorkflowStatus', () => {
		it('is not enrolled without a project', () => {
			expect(store.getWorkflowStatus('wf-1', null)).toEqual({ enrolled: false, config: null });
		});

		it('enrolls a workflow of a project with an active configuration', () => {
			const status = store.getWorkflowStatus('wf-1', PROJECT_ID);

			expect(status.enrolled).toBe(true);
		});

		it('only enrolls the selected workflows when the scope is limited', () => {
			const [defaultConfig] = store.getProjectConfigs(PROJECT_ID);
			store.updateConfig(PROJECT_ID, defaultConfig.id, {
				scope: 'selected',
				selectedWorkflowIds: ['wf-2'],
			});

			expect(store.getWorkflowStatus('wf-1', PROJECT_ID).enrolled).toBe(false);
			expect(store.getWorkflowStatus('wf-2', PROJECT_ID).enrolled).toBe(true);
		});

		it('is stable for the same workflow id', () => {
			const first = store.getWorkflowStatus('wf-stable', PROJECT_ID);
			const second = store.getWorkflowStatus('wf-stable', PROJECT_ID);

			expect(first.enrolled && first.state).toBe(second.enrolled && second.state);
		});
	});

	describe('reviews', () => {
		it('seeds one open fix review, two open outcomes and one closed review', () => {
			const open = store.getInboxItems('open', 'waiting');
			const closed = store.getInboxItems('closed');

			expect(open).toHaveLength(3);
			expect(closed).toHaveLength(1);
			expect(open[0].title).toMatch(/^Auto-fix:/);
			expect(open.every((item) => item.requester?.id === SELF_HEALING_ASSISTANT.id)).toBe(true);
			// Seeded items are reviewed by the signed-in user.
			expect(open[0].reviewers[0].id).toBe('user-1');
			expect(store.countByState('open')).toBe(3);
		});

		it('puts nothing in the authored group', () => {
			expect(store.getInboxItems('open', 'authored')).toEqual([]);
		});

		it('serves a detail with a diffable pinned and baseline version', () => {
			const [item] = store.getInboxItems('open', 'waiting');
			const detail = store.getDetail(item.id);

			expect(detail?.viewerCanDecide).toBe(true);
			expect(detail?.workflows[0].pinnedVersion?.nodes.length).toBeGreaterThan(0);
			expect(detail?.workflows[0].baselineVersion?.versionId).not.toBe(
				detail?.workflows[0].pinnedVersion?.versionId,
			);
			expect(store.getReviewSummary(item.id)).toContain('Failed:');
		});

		it('approving closes the review, publishes the version and heals the workflow', () => {
			const [item] = store.getInboxItems('open', 'waiting');
			const detail = store.getDetail(item.id);
			const workflowId = detail?.workflows[0].workflowId ?? '';

			const response = store.decide(item.id, { decision: 'approved', note: 'Ship it' });

			expect(response).toMatchObject({
				state: 'closed',
				decision: 'approved',
				autoPublish: { status: 'published' },
			});
			expect(item.state).toBe('closed');
			expect(detail?.viewerCanDecide).toBe(false);
			expect(detail?.workflows[0].publishedVersionId).toBe(
				detail?.workflows[0].pinnedVersion?.versionId,
			);
			expect(store.getActivity(item.id).map((entry) => entry.type)).toEqual([
				'review.opened',
				'comment.created',
				'review.approved',
				'workflow.published',
			]);
			expect(store.getWorkflowStatus(workflowId, PROJECT_ID)).toMatchObject({
				enrolled: true,
				state: 'healed',
				reviewId: item.id,
			});
		});

		it('requesting changes keeps the review open and records the note', () => {
			const [item] = store.getInboxItems('open', 'waiting');

			store.decide(item.id, { decision: 'changes_requested', note: 'Use 2 retries' });

			expect(item.state).toBe('open');
			expect(item.decision).toBe('changes_requested');
			const last = store.getActivity(item.id).at(-1);
			expect(last?.type).toBe('review.changes_requested');
			expect(last?.type === 'review.changes_requested' && last.data?.note).toBe('Use 2 retries');
		});

		it('appends a comment by the viewer', () => {
			const [item] = store.getInboxItems('open', 'waiting');

			const entry = store.addComment(item.id, 'Looks reasonable.');

			expect(entry.type).toBe('comment.created');
			expect(entry.createdBy?.id).toBe('user-1');
			// The store keeps a reactive proxy of the entry, so compare by id.
			expect(store.getActivity(item.id).at(-1)?.id).toBe(entry.id);
		});
	});

	describe('inbox kinds', () => {
		it('seeds one item of each kind into the open inbox', () => {
			const kinds = store.getInboxItems('open').map((item) => store.getInboxKind(item.id));
			expect(kinds).toEqual(expect.arrayContaining(['fix', 'needs_you', 'could_not_fix']));
		});

		it('exposes the outcome only for items that are not reviews', () => {
			const items = store.getInboxItems('open');
			const fix = items.find((item) => store.getInboxKind(item.id) === 'fix');
			const needsYou = items.find((item) => store.getInboxKind(item.id) === 'needs_you');
			expect(fix && store.getOutcome(fix.id)).toBeNull();
			expect(needsYou && store.getOutcome(needsYou.id)?.action?.type).toBe('open_credential');
		});

		it('opens each description with the outcome for its kind', () => {
			const leadOf = (kind: string) => {
				const item = store.getInboxItems('open').find((i) => store.getInboxKind(i.id) === kind);
				return store.getDetail(item?.id ?? '')?.description?.split('\n')[0] ?? '';
			};
			expect(leadOf('fix')).toMatch(/^Fix ready for review/);
			expect(leadOf('needs_you')).toMatch(/^Action needed:/);
			expect(leadOf('could_not_fix')).toMatch(/^No fix prepared/);
		});

		it('offers no decision on outcome items', () => {
			const couldNotFix = store
				.getInboxItems('open')
				.find((item) => store.getInboxKind(item.id) === 'could_not_fix');
			if (!couldNotFix) throw new Error('missing seed');

			expect(store.getDetail(couldNotFix.id)?.viewerCanDecide).toBe(false);
			expect(() => store.decide(couldNotFix.id, { decision: 'approved' })).toThrow();
		});

		it('keeps a trace for every item, with tool calls only where the assistant ran', () => {
			const items = store.getInboxItems('open');
			const traceOf = (kind: string) =>
				store.getTrace(items.find((item) => store.getInboxKind(item.id) === kind)?.id ?? '');

			for (const kind of ['fix', 'needs_you', 'could_not_fix']) {
				expect(traceOf(kind).length).toBeGreaterThan(0);
			}
			expect(traceOf('fix').some((entry) => entry.type === 'tool')).toBe(true);
			expect(traceOf('needs_you').some((entry) => entry.type === 'tool')).toBe(false);
		});

		it('reports what each investigation cost', () => {
			const items = store.getInboxItems('open');
			const kindOf = (kind: string) => items.find((item) => store.getInboxKind(item.id) === kind);
			expect(store.getUsage(kindOf('fix')?.id ?? '')?.credits).toBeGreaterThan(0);
			expect(store.getUsage(kindOf('could_not_fix')?.id ?? '')?.credits).toBeGreaterThan(0);
			expect(store.getUsage(kindOf('needs_you')?.id ?? '')).toBeNull();
			expect(store.getUsage('unknown')).toBeUndefined();
		});
	});

	describe('coachmark', () => {
		it('shows for a failed execution only', () => {
			expect(store.shouldShowCoachmark(failedExecution())).toBe(true);
			expect(store.shouldShowCoachmark(failedExecution({ status: 'success' }))).toBe(false);
		});

		it('hides once the flag is off', () => {
			mockGetVariant.mockReturnValue(SELF_HEALING_WORKFLOWS_EXPERIMENT.control);
			expect(store.shouldShowCoachmark(failedExecution())).toBe(false);
		});

		it('hides for the current visit and comes back after a reset', () => {
			store.dismissCoachmark();
			expect(store.isCoachmarkDismissed).toBe(true);
			expect(store.shouldShowCoachmark(failedExecution())).toBe(false);

			store.resetCoachmark();
			expect(store.shouldShowCoachmark(failedExecution())).toBe(true);
		});
	});

	describe('startFix', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('runs, then submits a review and marks the workflow as in review', async () => {
			const execution = failedExecution();

			const pending = store.startFix(execution, {
				workflowName: 'Order sync',
				projectId: PROJECT_ID,
				nodes: [
					{
						id: 'n1',
						name: 'Post to Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			expect(store.getFixJob('501')).toMatchObject({ status: 'running', workflowId: 'wf-1' });
			expect(store.getWorkflowStatus('wf-1', PROJECT_ID)).toMatchObject({ state: 'fixing' });

			await vi.advanceTimersByTimeAsync(SELF_HEALING_FIX_DURATION_MS);
			const reviewId = await expectReviewId(pending);

			expect(isSelfHealingReviewId(reviewId)).toBe(true);
			expect(store.getFixJob('501')).toMatchObject({
				status: 'submitted',
				reviewId,
				changedNode: 'Post to Slack',
			});
			expect(store.getWorkflowStatus('wf-1', PROJECT_ID)).toMatchObject({
				state: 'in_review',
				reviewId,
			});

			const review = store.findReview(reviewId);
			expect(review?.item.title).toBe('Auto-fix: Retry "Post to Slack" on failure in Order sync');
			expect(review?.item.state).toBe('open');
			expect(store.getInboxItems('open', 'waiting')[0].id).toBe(reviewId);

			const fixedNode = review?.detail.workflows[0].pinnedVersion?.nodes.find(
				(node) => node.name === 'Post to Slack',
			);
			expect(fixedNode).toMatchObject({ retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 });
		});

		it('assigns the configured reviewers to the new review', async () => {
			const [defaultConfig] = store.getProjectConfigs(PROJECT_ID);
			store.updateConfig(PROJECT_ID, defaultConfig.id, {
				notifyProjectMembers: false,
				reviewerIds: ['user-2', 'missing'],
			});

			const pending = store.startFix(failedExecution(), {
				workflowName: 'Order sync',
				projectId: PROJECT_ID,
			});
			await vi.advanceTimersByTimeAsync(SELF_HEALING_FIX_DURATION_MS);
			const reviewId = await expectReviewId(pending);

			expect(store.findReview(reviewId)?.item.reviewers.map((user) => user.id)).toEqual(['user-2']);
		});

		it('only diagnoses when the project is set to diagnose and notify', async () => {
			const [defaultConfig] = store.getProjectConfigs(PROJECT_ID);
			store.updateConfig(PROJECT_ID, defaultConfig.id, { autonomy: 'diagnose' });
			const openBefore = store.countByState('open');

			const pending = store.startFix(failedExecution(), {
				workflowName: 'Order sync',
				projectId: PROJECT_ID,
			});
			await vi.advanceTimersByTimeAsync(SELF_HEALING_FIX_DURATION_MS);

			expect(await pending).toBeNull();
			expect(store.getFixJob('501')).toMatchObject({
				status: 'diagnosed',
				suggestedFix: expect.stringContaining('Post to Slack'),
			});
			expect(store.getWorkflowStatus('wf-1', PROJECT_ID)).toMatchObject({ state: 'diagnosed' });
			expect(store.countByState('open')).toBe(openBefore);
		});

		it('deploys straight away when the project auto-deploys', async () => {
			const [defaultConfig] = store.getProjectConfigs(PROJECT_ID);
			store.updateConfig(PROJECT_ID, defaultConfig.id, { autonomy: 'deploy' });

			const pending = store.startFix(failedExecution(), {
				workflowName: 'Order sync',
				projectId: PROJECT_ID,
			});
			await vi.advanceTimersByTimeAsync(SELF_HEALING_FIX_DURATION_MS);
			const reviewId = await expectReviewId(pending);

			expect(store.findReview(reviewId)?.item).toMatchObject({
				state: 'closed',
				decision: 'approved',
			});
			expect(store.getWorkflowStatus('wf-1', PROJECT_ID)).toMatchObject({
				state: 'healed',
				reviewId,
			});
		});

		it('returns the existing review when the same execution is fixed twice', async () => {
			const pending = store.startFix(failedExecution(), {
				workflowName: 'Order sync',
				projectId: PROJECT_ID,
			});
			await vi.advanceTimersByTimeAsync(SELF_HEALING_FIX_DURATION_MS);
			const first = await pending;

			const second = await store.startFix(failedExecution(), {
				workflowName: 'Order sync',
				projectId: PROJECT_ID,
			});

			expect(second).toBe(first);
		});
	});
});
