import { nextTick, ref } from 'vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PromotionPreview } from '@n8n/api-types';
import { waitAllPromises } from '@/__tests__/utils';
import { usePromotionChangeCount } from './usePromotionChangeCount';
import * as api from '../promotions.api';
import { resource } from '../__tests__/preview.fixtures';

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
	resources: Array.from({ length: count }, (_, index) =>
		resource({
			key: `workflow:workflow-${index}`,
			name: `Workflow ${index}`,
			change: 'added',
		}),
	),
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

	it.each([
		{ direction: 'promote' as const, expected: 1 },
		{ direction: 'apply' as const, expected: 2 },
	])('should count changes included by $direction', async ({ direction, expected }) => {
		const { changeCount } = usePromotionChangeCount(ref('project-a'), direction, ref(true));
		const result = preview(1);
		result.resources.push(resource({ key: 'folder:empty', name: 'Empty folder', change: 'added' }));

		pending[0].resolve(result);
		await waitAllPromises();

		expect(changeCount.value).toBe(expected);
	});

	it('should keep the newest result when an older request answers last', async () => {
		const projectId = ref<string | undefined>('project-a');
		const { changeCount, failed } = usePromotionChangeCount(projectId, 'apply', ref(true));

		projectId.value = 'project-b';
		await nextTick();
		projectId.value = 'project-a';
		await nextTick();
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(3);

		pending[2].resolve(preview(2));
		await waitAllPromises();
		expect(changeCount.value).toBe(2);

		// The first request was for the same project, so a project id check alone would accept it.
		pending[0].resolve(preview(5));
		pending[1].reject(new Error('offline'));
		await waitAllPromises();
		expect(changeCount.value).toBe(2);
		expect(failed.value).toBe(false);
	});
});
