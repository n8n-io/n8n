import { nextTick, ref } from 'vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PromotionChanges } from '@n8n/api-types';
import { waitAllPromises } from '@/__tests__/utils';
import { usePromotionChangeCount } from './usePromotionChangeCount';
import { usePromotionChanges } from './usePromotionChanges';
import { invalidatePromotionChanges } from './promotionChanges.cache';
import * as api from '../promotions.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('../promotions.api');

type Pending = {
	resolve: (changes: PromotionChanges) => void;
	reject: (error: Error) => void;
};

const changes = (count: number): PromotionChanges => ({
	commitSha: 'a'.repeat(40),
	changes: Array.from({ length: count }, (_, index) => ({
		id: `workflow-${index}`,
		name: `Workflow ${index}`,
		type: 'workflow',
		status: 'new',
		version: null,
		updatedAt: null,
		updatedBy: null,
		dependencyCount: 0,
	})),
});

describe('usePromotionChangeCount', () => {
	// One entry per request, in call order, so a test can answer them out of order.
	let pending: Pending[];

	beforeEach(() => {
		pending = [];
		vi.clearAllMocks();
		invalidatePromotionChanges();
		vi.mocked(api.getPromotableChanges).mockImplementation(
			async () =>
				await new Promise<PromotionChanges>((resolve, reject) => {
					pending.push({ resolve, reject });
				}),
		);
	});

	it('should share one request with the modal, so opening it costs nothing', async () => {
		const { count, lastRefreshedAt } = usePromotionChangeCount(
			ref('project-a'),
			'apply',
			ref(true),
		);
		await nextTick();
		pending[0].resolve(changes(2));
		await waitAllPromises();
		expect(count.value).toBe(2);

		const modal = usePromotionChanges('project-a', 'apply');
		await modal.loadChanges();

		expect(api.getPromotableChanges).toHaveBeenCalledTimes(1);
		expect(modal.changes.value).toHaveLength(2);
		expect(modal.lastRefreshedAt.value).toBe(lastRefreshedAt.value);
	});

	it('should keep the last count and timestamp while a refresh is in flight', async () => {
		const { count, isLoading, lastRefreshedAt, refetch } = usePromotionChangeCount(
			ref('project-a'),
			'apply',
			ref(true),
		);
		await nextTick();
		pending[0].resolve(changes(3));
		await waitAllPromises();
		const firstRefresh = lastRefreshedAt.value;

		void refetch();
		await nextTick();

		expect(isLoading.value).toBe(true);
		expect(count.value).toBe(3);
		expect(lastRefreshedAt.value).toBe(firstRefresh);

		pending[1].resolve(changes(1));
		await waitAllPromises();
		expect(count.value).toBe(1);
	});

	it('should keep the count and the timestamp through a failed refresh until one succeeds', async () => {
		const { count, failed, lastRefreshedAt, refetch } = usePromotionChangeCount(
			ref('project-a'),
			'apply',
			ref(true),
		);
		await nextTick();
		pending[0].resolve(changes(2));
		await waitAllPromises();
		const firstRefresh = lastRefreshedAt.value;

		void refetch();
		await waitAllPromises();
		pending[1].reject(new Error('offline'));
		await waitAllPromises();
		expect(failed.value).toBe(true);
		expect(count.value).toBe(2);
		expect(lastRefreshedAt.value).toBe(firstRefresh);

		void refetch();
		await waitAllPromises();
		pending[2].resolve(changes(1));
		await waitAllPromises();
		expect(failed.value).toBe(false);
		expect(count.value).toBe(1);
	});

	it('should never show one project the result of another', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { count, lastRefreshedAt } = usePromotionChangeCount(projectId, 'apply', ref(true));
		await nextTick();
		pending[0].resolve(changes(5));
		await waitAllPromises();
		expect(count.value).toBe(5);

		projectId.value = 'project-b';
		await nextTick();

		// Each project has its own entry, so project A's count and timestamp cannot leak.
		expect(count.value).toBe(0);
		expect(lastRefreshedAt.value).toBeNull();

		pending[1].reject(new Error('offline'));
		await waitAllPromises();
		expect(lastRefreshedAt.value).toBeNull();
	});

	it('should report no loading state once the banner turns off', async () => {
		const enabled = ref(true);
		const { isLoading } = usePromotionChangeCount(ref('project-a'), 'apply', enabled);
		await nextTick();
		expect(isLoading.value).toBe(true);

		enabled.value = false;
		await nextTick();

		expect(isLoading.value).toBe(false);
	});
});
