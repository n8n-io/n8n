import { nextTick, ref } from 'vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PromotionPreview } from '@n8n/api-types';
import { waitAllPromises } from '@/__tests__/utils';
import { usePromotionChangeCount } from './usePromotionChangeCount';
import * as api from '../promotions.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('../promotions.api');

type Pending = {
	resolve: (preview: PromotionPreview) => void;
	reject: (error: Error) => void;
};

const preview = (count: number): PromotionPreview => ({
	commitSha: 'a'.repeat(40),
	source: { environmentId: 'config-1', branchName: 'main' },
	resources: [],
	dependencies: [],
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
		vi.mocked(api.getPromotionPreview).mockImplementation(
			async () =>
				await new Promise<PromotionPreview>((resolve, reject) => {
					pending.push({ resolve, reject });
				}),
		);
	});

	it('should keep the newest result when an older request answers last', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { workflowCount, failed } = usePromotionChangeCount(projectId, 'apply', ref(true));

		projectId.value = 'project-b';
		await nextTick();
		projectId.value = 'project-a';
		await nextTick();
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(3);

		pending[2].resolve(preview(2));
		await waitAllPromises();
		expect(workflowCount.value).toBe(2);

		// The first request was for the same project, so a project id check alone would accept it.
		pending[0].resolve(preview(5));
		pending[1].reject(new Error('offline'));
		await waitAllPromises();
		expect(workflowCount.value).toBe(2);
		expect(failed.value).toBe(false);
	});
});
