import type { PromotionPreview, PromotionResourceDetails } from '@n8n/api-types';
import { waitAllPromises } from '@n8n/frontend-test-utils';
import { computed, ref, shallowRef } from 'vue';

import {
	billingPreview,
	billingResources,
	COMMIT_SHA,
	resource,
} from '../__tests__/preview.fixtures';
import * as api from '../promotions.api';
import { buildSelectionGraph } from '../promotionPreview.selection';
import { usePromotionResourceDetails } from './usePromotionResourceDetails';

const restApiContext = { baseUrl: 'https://example.test/rest' };
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext }) }));
vi.mock('../promotions.api');

function setup(initial: PromotionPreview, openWorkflowKey?: string) {
	const preview = shallowRef<PromotionPreview | null>(initial);
	const graph = computed(() =>
		preview.value ? buildSelectionGraph(preview.value, 'promote') : null,
	);
	return {
		preview,
		...usePromotionResourceDetails(ref('p1'), ref('promote'), preview, graph, ref(openWorkflowKey)),
	};
}

const tagDetail = (revision = { before: 'g1-before', after: 'g1-after' }) => ({
	key: 'tag:g1',
	type: 'tag' as const,
	before: { id: 'g1', name: 'finance' },
	after: { id: 'g1', name: 'finance' },
	revision,
});

describe('usePromotionResourceDetails', () => {
	beforeEach(() => {
		vi.mocked(api.getPromotionResourceDetails).mockReset();
	});

	it('should load cards in batches the endpoint accepts and skip sub-workflows without a file', async () => {
		vi.mocked(api.getPromotionResourceDetails).mockResolvedValue({ details: [], missingKeys: [] });
		const workflows = Array.from({ length: 60 }, (_, index) =>
			resource({
				key: `workflow:many${index}`,
				name: `Workflow ${index}`,
				parentKey: 'project:p1',
			}),
		);
		const { request } = setup(
			billingPreview({ resources: [...billingPreview().resources, ...workflows] }),
		);

		await request([billingResources.sharedLogger.key, ...workflows.map((w) => w.key)]);

		const calls = vi.mocked(api.getPromotionResourceDetails).mock.calls;
		expect(calls.map(([, , , payload]) => payload.keys.length)).toEqual([50, 10]);
		expect(calls[0]).toEqual([
			restApiContext,
			'p1',
			'promote',
			expect.objectContaining({ commitSha: COMMIT_SHA }),
		]);
	});

	it('should mark cards whose resource disappeared after the preview loaded', async () => {
		vi.mocked(api.getPromotionResourceDetails).mockResolvedValue({
			details: [tagDetail()],
			missingKeys: [billingResources.reminders.key],
		});
		const { request, entries } = setup(billingPreview());

		await request(['tag:g1', billingResources.reminders.key]);

		expect(entries.value.get('tag:g1')).toEqual({ status: 'loaded', detail: tagDetail() });
		expect(entries.value.get(billingResources.reminders.key)).toEqual({ status: 'missing' });
	});

	it('should load the changed resources and the open workflow of a new preview and drop late answers', async () => {
		let answer: (details: PromotionResourceDetails) => void = () => {};
		vi.mocked(api.getPromotionResourceDetails)
			.mockReturnValueOnce(
				new Promise((resolve) => {
					answer = resolve;
				}),
			)
			.mockResolvedValue({ details: [], missingKeys: [] });
		const { request, entries, preview } = setup(billingPreview(), 'workflow:w1');

		const pending = request(['tag:g1']);
		await waitAllPromises();
		preview.value = billingPreview({ commitSha: 'd'.repeat(40) });
		await waitAllPromises();
		answer({ details: [tagDetail()], missingKeys: [] });
		await pending;

		// The new preview loaded its own changed resources and the open diff, but not the other
		// changed workflow. The answer for the old preview is ignored.
		expect([...entries.value.keys()]).toEqual([
			'folder:f1',
			'workflow:w1',
			'dataTable:t1',
			'variable:global:API_URL',
		]);
	});
});
