import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRestrictReviewStore } from './restrict-review.store';
import { useInstancePolicyStore } from '../instance-policy.store';

const mocks = vi.hoisted(() => ({
	fetchNodeTypeUsage: vi.fn(),
	fetchCredentialTypeUsage: vi.fn(),
}));

vi.mock('../../type-availability-policies.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	...mocks,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' } }),
}));

const NOTION = 'n8n-nodes-base.notion';
const SLACK = 'n8n-nodes-base.slack';
const IN_USE = { uses: 3, workflows: 2, activeWorkflows: 0, projects: 1 };

/** Restricts two types in use, so that the Slack review waits for the Notion one. */
function restrictNotionThenSlack() {
	mocks.fetchNodeTypeUsage.mockResolvedValue({ [NOTION]: IN_USE, [SLACK]: IN_USE });
	const review = useRestrictReviewStore();
	const notion = review.reviewChange('node', NOTION, 'deny', 'Notion');
	const slack = review.reviewChange('node', SLACK, 'deny', 'Slack');
	return { review, notion, slack };
}

describe('useRestrictReviewStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchNodeTypeUsage.mockResolvedValue({ [NOTION]: IN_USE });
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
	});

	it('applies with no review to restrict a type that no workflow uses', async () => {
		await useInstancePolicyStore().loadUsage('credential');
		const review = useRestrictReviewStore();

		await expect(
			review.reviewChange('credential', 'notionApi', 'deny', 'Notion API'),
		).resolves.toBe(true);
		expect(review.request).toBeNull();
	});

	it('reads the usage again before it restricts, so a type that is now in use opens a review', async () => {
		mocks.fetchNodeTypeUsage.mockResolvedValueOnce({});
		await useInstancePolicyStore().loadUsage('node');
		const review = useRestrictReviewStore();

		const confirmed = review.reviewChange('node', NOTION, 'deny', 'Notion');
		await vi.waitFor(() => expect(review.request?.usage).toEqual(IN_USE));
		expect(mocks.fetchNodeTypeUsage).toHaveBeenCalledTimes(2);

		review.resolve(false);
		await expect(confirmed).resolves.toBe(false);
	});

	it('applies at once to allow a type or open it to projects', async () => {
		await useInstancePolicyStore().loadUsage('node');
		const review = useRestrictReviewStore();

		expect(review.reviewChange('node', NOTION, 'allow', 'Notion')).toBe(true);
		expect(review.reviewChange('node', NOTION, 'delegate', 'Notion')).toBe(true);
		expect(review.request).toBeNull();
	});

	it('loads the counts, then opens a review with the usage of a type in use', async () => {
		const review = useRestrictReviewStore();

		const confirmed = review.reviewChange('node', NOTION, 'deny', 'Notion');
		await vi.waitFor(() =>
			expect(review.request).toEqual({
				kind: 'node',
				name: NOTION,
				label: 'Notion',
				usage: IN_USE,
			}),
		);
		expect(mocks.fetchNodeTypeUsage).toHaveBeenCalledTimes(1);

		review.resolve(true);
		await expect(confirmed).resolves.toBe(true);
		expect(review.request).toBeNull();
	});

	it('applies with no review when the counts show no usage', async () => {
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
		const review = useRestrictReviewStore();

		await expect(review.reviewChange('node', NOTION, 'deny', 'Notion')).resolves.toBe(true);
		expect(review.request).toBeNull();
	});

	it('opens a review with unknown usage when the counts do not load', async () => {
		mocks.fetchNodeTypeUsage.mockRejectedValue(new Error('boom'));
		const review = useRestrictReviewStore();

		const confirmed = review.reviewChange('node', NOTION, 'deny', 'Notion');
		await vi.waitFor(() => expect(review.request?.usage).toBeNull());

		review.resolve(false);
		await expect(confirmed).resolves.toBe(false);
	});

	it('drops a review that still loads its counts when a later change of the type starts', async () => {
		const counts = createDeferredPromise<Record<string, typeof IN_USE>>();
		mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
		const review = useRestrictReviewStore();

		const restrict = review.reviewChange('node', NOTION, 'deny', 'Notion');
		expect(review.reviewChange('node', NOTION, 'allow', 'Notion')).toBe(true);
		counts.resolve({ [NOTION]: IN_USE });

		await expect(restrict).resolves.toBe(false);
		expect(review.request).toBeNull();
	});

	it('shows a second review only after the admin answers the first one', async () => {
		const { review, notion, slack } = restrictNotionThenSlack();
		expect(review.isChecking('node', NOTION)).toBe(true);
		await vi.waitFor(() => expect(review.request?.label).toBe('Notion'));
		// The open review no longer checks, and the one that waits for its turn still does.
		expect(review.isChecking('node', NOTION)).toBe(false);
		expect(review.isChecking('node', SLACK)).toBe(true);

		review.resolve(true);
		await expect(notion).resolves.toBe(true);
		await vi.waitFor(() => expect(review.request?.label).toBe('Slack'));
		expect(review.isChecking('node', SLACK)).toBe(false);

		review.resolve(false);
		await expect(slack).resolves.toBe(false);
		expect(review.request).toBeNull();
	});

	it('drops a review that waits for its turn when a later change of its type starts', async () => {
		const { review, notion, slack } = restrictNotionThenSlack();
		await vi.waitFor(() => expect(review.request?.label).toBe('Notion'));
		expect(review.reviewChange('node', SLACK, 'allow', 'Slack')).toBe(true);

		review.resolve(true);
		await expect(notion).resolves.toBe(true);
		await expect(slack).resolves.toBe(false);
		expect(review.request).toBeNull();
	});

	it('drops each waiting review when all reviews are cancelled', async () => {
		const { review, notion, slack } = restrictNotionThenSlack();
		await vi.waitFor(() => expect(review.request?.label).toBe('Notion'));
		review.cancelAll();
		expect(review.isChecking('node', SLACK)).toBe(false);

		await expect(notion).resolves.toBe(false);
		await expect(slack).resolves.toBe(false);
		expect(review.request).toBeNull();
	});

	it('opens no review that was still loading its counts when all reviews are cancelled', async () => {
		const counts = createDeferredPromise<Record<string, typeof IN_USE>>();
		mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
		const review = useRestrictReviewStore();

		const confirmed = review.reviewChange('node', NOTION, 'deny', 'Notion');
		review.cancelAll();
		counts.resolve({ [NOTION]: IN_USE });

		await expect(confirmed).resolves.toBe(false);
		expect(review.request).toBeNull();
	});

	it('cancels the open review when all reviews are cancelled', async () => {
		await useInstancePolicyStore().loadUsage('node');
		const review = useRestrictReviewStore();

		const confirmed = review.reviewChange('node', NOTION, 'deny', 'Notion');
		await vi.waitFor(() => expect(review.request).not.toBeNull());
		review.cancelAll();

		await expect(confirmed).resolves.toBe(false);
		expect(review.request).toBeNull();
	});
});
