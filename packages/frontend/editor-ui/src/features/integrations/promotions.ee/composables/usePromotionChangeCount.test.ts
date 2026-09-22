import { nextTick, ref } from 'vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PromotionChanges } from '@n8n/api-types';
import { waitAllPromises } from '@/__tests__/utils';
import { usePromotionChangeCount } from './usePromotionChangeCount';
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
		vi.mocked(api.getPromotableChanges).mockImplementation(
			async () =>
				await new Promise<PromotionChanges>((resolve, reject) => {
					pending.push({ resolve, reject });
				}),
		);
	});

	it('should keep the newest result when an older request answers last', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { count, failed } = usePromotionChangeCount(projectId, 'apply', ref(true));

		projectId.value = 'project-b';
		await nextTick();
		projectId.value = 'project-a';
		await nextTick();
		expect(api.getPromotableChanges).toHaveBeenCalledTimes(3);

		pending[2].resolve(changes(2));
		await waitAllPromises();
		expect(count.value).toBe(2);

		// The first request was for the same project, so a project id check alone would accept it.
		pending[0].resolve(changes(5));
		pending[1].reject(new Error('offline'));
		await waitAllPromises();
		expect(count.value).toBe(2);
		expect(failed.value).toBe(false);
	});

	it('should keep the last count visible while a same-project refresh is in flight', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { count, isLoading, refetch } = usePromotionChangeCount(projectId, 'apply', ref(true));

		pending[0].resolve(changes(3));
		await waitAllPromises();
		expect(count.value).toBe(3);

		void refetch();
		await nextTick();
		expect(isLoading.value).toBe(true);
		// No flicker to 0 while the manual refresh of the same project is pending.
		expect(count.value).toBe(3);

		pending[1].resolve(changes(1));
		await waitAllPromises();
		expect(count.value).toBe(1);
		expect(isLoading.value).toBe(false);
	});

	it('should stop loading when the banner turns off while a request is pending', async () => {
		const enabled = ref(true);
		const projectId = ref<string | undefined>('project-a');
		const { isLoading } = usePromotionChangeCount(projectId, 'apply', enabled);
		await nextTick();
		expect(isLoading.value).toBe(true);

		// The pending request is invalidated, so nothing is left to clear the loading state.
		enabled.value = false;
		await nextTick();

		expect(isLoading.value).toBe(false);
	});

	it('should clear the count when switching to a project with no request in flight', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { count } = usePromotionChangeCount(projectId, 'apply', ref(true));

		pending[0].resolve(changes(3));
		await waitAllPromises();
		expect(count.value).toBe(3);

		projectId.value = 'project-b';
		await nextTick();
		// A different project must not show the previous project's stale count while loading.
		expect(count.value).toBe(0);
	});

	it('should clear a previous failure once a refresh succeeds', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { count, failed, refetch } = usePromotionChangeCount(projectId, 'apply', ref(true));

		pending[0].reject(new Error('offline'));
		await waitAllPromises();
		expect(failed.value).toBe(true);

		void refetch();
		await waitAllPromises();
		pending[1].resolve(changes(2));
		await waitAllPromises();
		expect(failed.value).toBe(false);
		expect(count.value).toBe(2);
	});
});
