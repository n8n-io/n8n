import type { PageBacklinks } from '@n8n/api-types';
import { ref } from 'vue';

import { usePageBacklinks } from './usePageBacklinks';

const backlinksOf = vi.hoisted(() => vi.fn<(pageId: string) => Promise<PageBacklinks>>());

vi.mock('../page.store', () => ({
	usePageStore: () => ({ backlinksOf }),
}));

async function flushPromises() {
	await new Promise((resolve) => setTimeout(resolve));
}

const NONE: PageBacklinks = { pages: [], workflows: [] };

function onCanvasOf(workflowId: string): PageBacklinks {
	return {
		pages: [],
		workflows: [{ workflowId, workflowName: workflowId, nodeId: 'sticky-1', nodeName: 'Note' }],
	};
}

describe('usePageBacklinks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads the backlinks of the page at once', async () => {
		backlinksOf.mockResolvedValue(onCanvasOf('wf-1'));

		const { backlinks } = usePageBacklinks(ref('page-1'));
		expect(backlinks.value).toEqual(NONE);
		await flushPromises();

		expect(backlinksOf).toHaveBeenCalledWith('page-1');
		expect(backlinks.value).toEqual(onCanvasOf('wf-1'));
	});

	it('asks nothing while no page is open', async () => {
		const { backlinks, refresh } = usePageBacklinks(ref(undefined));
		await refresh();

		expect(backlinksOf).not.toHaveBeenCalled();
		expect(backlinks.value).toEqual(NONE);
	});

	it('clears the list and loads again when the page changes', async () => {
		backlinksOf.mockResolvedValueOnce(onCanvasOf('wf-1')).mockResolvedValueOnce(onCanvasOf('wf-2'));
		const pageId = ref('page-1');
		const { backlinks } = usePageBacklinks(pageId);
		await flushPromises();

		pageId.value = 'page-2';
		await Promise.resolve();
		expect(backlinks.value).toEqual(NONE);
		await flushPromises();

		expect(backlinks.value).toEqual(onCanvasOf('wf-2'));
	});

	it('keeps the current list during a refresh, then shows the new one', async () => {
		backlinksOf.mockResolvedValueOnce(onCanvasOf('wf-1'));
		const { backlinks, refresh } = usePageBacklinks(ref('page-1'));
		await flushPromises();
		let answer: (latest: PageBacklinks) => void = () => {};
		backlinksOf.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));

		const refreshed = refresh();
		expect(backlinks.value).toEqual(onCanvasOf('wf-1'));
		answer(onCanvasOf('wf-2'));
		await refreshed;

		expect(backlinks.value).toEqual(onCanvasOf('wf-2'));
	});

	it('drops an answer that arrives after the user opened another page', async () => {
		let answerFirst: (latest: PageBacklinks) => void = () => {};
		backlinksOf
			.mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
			.mockResolvedValueOnce(onCanvasOf('wf-2'));
		const pageId = ref('page-1');
		const { backlinks } = usePageBacklinks(pageId);

		pageId.value = 'page-2';
		await flushPromises();
		answerFirst(onCanvasOf('wf-1'));
		await flushPromises();

		expect(backlinks.value).toEqual(onCanvasOf('wf-2'));
	});

	it('shows no backlinks when the request fails', async () => {
		backlinksOf.mockRejectedValue(new Error('Server error'));

		const { backlinks } = usePageBacklinks(ref('page-1'));
		await flushPromises();

		expect(backlinks.value).toEqual(NONE);
	});
});
