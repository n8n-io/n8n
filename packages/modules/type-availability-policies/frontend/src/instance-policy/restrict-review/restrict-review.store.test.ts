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
const IN_USE = { uses: 3, workflows: 2, activeWorkflows: 0, projects: 1 };

describe('useRestrictReviewStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchNodeTypeUsage.mockResolvedValue({ [NOTION]: IN_USE });
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
	});

	it('needs no review for a type that no workflow uses', async () => {
		await useInstancePolicyStore().loadUsage('credential');
		const review = useRestrictReviewStore();

		expect(review.needsReview('credential', 'notionApi', 'deny')).toBe(false);
		await expect(review.confirmRestrict('credential', 'notionApi', 'Notion API')).resolves.toBe(
			true,
		);
		expect(review.request).toBeNull();
	});

	it('never needs a review to allow a type or open it to projects', async () => {
		await useInstancePolicyStore().loadUsage('node');
		const review = useRestrictReviewStore();

		expect(review.needsReview('node', NOTION, 'allow')).toBe(false);
		expect(review.needsReview('node', NOTION, 'delegate')).toBe(false);
	});

	it('needs a review while the usage is not known', () => {
		expect(useRestrictReviewStore().needsReview('node', NOTION, 'deny')).toBe(true);
	});

	it('loads missing counts, then opens a review with the usage of a type in use', async () => {
		const review = useRestrictReviewStore();

		const confirmed = review.confirmRestrict('node', NOTION, 'Notion');
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

	it('opens a review with unknown usage when the counts do not load', async () => {
		mocks.fetchNodeTypeUsage.mockRejectedValue(new Error('boom'));
		const review = useRestrictReviewStore();

		const confirmed = review.confirmRestrict('node', NOTION, 'Notion');
		await vi.waitFor(() => expect(review.request?.usage).toBeNull());

		review.resolve(false);
		await expect(confirmed).resolves.toBe(false);
	});

	it('cancels an open review when another one opens', async () => {
		await useInstancePolicyStore().loadUsage('node');
		const review = useRestrictReviewStore();

		const first = review.confirmRestrict('node', NOTION, 'Notion');
		await vi.waitFor(() => expect(review.request?.label).toBe('Notion'));
		const second = review.confirmRestrict('node', NOTION, 'Notion again');

		await expect(first).resolves.toBe(false);
		await vi.waitFor(() => expect(review.request?.label).toBe('Notion again'));
		review.resolve(true);
		await expect(second).resolves.toBe(true);
	});

	it('opens no review that was still loading its counts when all reviews are cancelled', async () => {
		const counts = createDeferredPromise<Record<string, typeof IN_USE>>();
		mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
		const review = useRestrictReviewStore();

		const confirmed = review.confirmRestrict('node', NOTION, 'Notion');
		review.cancelAll();
		counts.resolve({ [NOTION]: IN_USE });

		await expect(confirmed).resolves.toBe(false);
		expect(review.request).toBeNull();
	});

	it('cancels the open review when all reviews are cancelled', async () => {
		await useInstancePolicyStore().loadUsage('node');
		const review = useRestrictReviewStore();

		const confirmed = review.confirmRestrict('node', NOTION, 'Notion');
		await vi.waitFor(() => expect(review.request).not.toBeNull());
		review.cancelAll();

		await expect(confirmed).resolves.toBe(false);
		expect(review.request).toBeNull();
	});
});
