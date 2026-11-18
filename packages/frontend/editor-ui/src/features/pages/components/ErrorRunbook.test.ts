import type { PageSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { ref, type Ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';

import { usePagePeekStore } from '../pagePeek.store';
import ErrorRunbook from './ErrorRunbook.vue';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	useErrorRunbookPages: vi.fn(),
	pages: undefined as unknown as { value: unknown[] },
	projectId: undefined as unknown as { value: string | undefined },
	isAssistantAvailable: undefined as unknown as { value: boolean },
}));

vi.mock('../composables/useErrorRunbookPages', () => ({
	useErrorRunbookPages: mocks.useErrorRunbookPages,
}));
vi.mock('../composables/useWorkflowPagesProjectId', () => ({
	useWorkflowPagesProjectId: () => mocks.projectId,
}));
vi.mock('../composables/useIsPageModuleActive', async () => {
	const { ref: vueRef } = await import('vue');
	return { useIsPageModuleActive: () => vueRef(true) };
});
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => mocks.isAssistantAvailable,
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ startThread: mocks.startThread }),
}));
vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/workflowDocument.store')>()),
	injectWorkflowDocumentStore: () => ({ value: { name: 'Sync orders to CRM' } }),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({
		resolve: vi.fn(({ params }: { params: { pageId: string } }) => ({
			href: `/page/${params.pageId}`,
		})),
	}),
}));

const toSummary = (id: string, title: string): PageSummary => ({
	id,
	title,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-01T00:00:00.000Z',
});

const ordersRunbook = toSummary('page-1', 'Orders runbook');
const salesReport = toSummary('page-2', 'Daily sales report');

const renderComponent = createComponentRenderer(ErrorRunbook, {
	props: {
		workflowId: 'w1',
		nodeId: 'n1',
		nodeName: 'Fetch new orders',
		errorMessage: 'The resource you are requesting could not be found',
		errorDescription: '404 - Not Found',
		executionId: '42',
	},
});

describe('ErrorRunbook', () => {
	let peekStore: MockedStore<typeof usePagePeekStore>;
	let pages: Ref<PageSummary[]>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		peekStore = mockedStore(usePagePeekStore);
		pages = ref([ordersRunbook, salesReport]);
		mocks.useErrorRunbookPages.mockReturnValue(pages);
		mocks.projectId = ref('p1');
		mocks.isAssistantAvailable = ref(true);
		mocks.startThread.mockResolvedValue('started');
	});

	it('should ask for the runbook pages of the failed node and its workflow', () => {
		renderComponent();

		const failure = mocks.useErrorRunbookPages.mock.calls[0][0] as () => unknown;
		expect(failure()).toEqual({ workflowId: 'w1', nodeId: 'n1' });
	});

	it('should show the title and one row for each page, with the address of the page', () => {
		const { getByTestId, getAllByTestId } = renderComponent();

		expect(getByTestId('error-runbook')).toHaveTextContent('Runbook');
		const rows = getAllByTestId('error-runbook-page');
		expect(rows.map((row) => row.textContent?.trim())).toEqual([
			'Orders runbook',
			'Daily sales report',
		]);
		expect(rows[0]).toHaveAttribute('href', '/page/page-1');
	});

	it('should render nothing when no page links to the node or the workflow', () => {
		pages.value = [];

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('error-runbook')).not.toBeInTheDocument();
	});

	it('should show the page in the side panel on a plain click', async () => {
		const { getAllByTestId } = renderComponent();

		await userEvent.click(getAllByTestId('error-runbook-page')[1]);

		expect(peekStore.open).toHaveBeenCalledExactlyOnceWith('page-2');
	});

	it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }])(
		'should leave a click with %o to the browser',
		async (modifier) => {
			const { getAllByTestId } = renderComponent();
			const row = getAllByTestId('error-runbook-page')[0];
			const clicks: MouseEvent[] = [];
			row.addEventListener('click', (event) => clicks.push(event));

			await fireEvent.click(row, modifier);

			expect(clicks.map((click) => click.defaultPrevented)).toEqual([false]);
			expect(peekStore.open).not.toHaveBeenCalled();
		},
	);

	it('should hide the assistant button when the assistant is not available', () => {
		mocks.isAssistantAvailable.value = false;

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('error-runbook')).toBeInTheDocument();
		expect(queryByTestId('error-runbook-ask-assistant')).not.toBeInTheDocument();
	});

	it('should hide the assistant button when no project can hold the thread', () => {
		mocks.projectId.value = undefined;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('error-runbook-ask-assistant')).not.toBeInTheDocument();
	});

	it('should send the failure and the links of the runbook pages to the assistant', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('error-runbook-ask-assistant'));

		expect(getByTestId('error-runbook-ask-assistant')).toHaveTextContent('Ask the assistant');
		expect(mocks.startThread).toHaveBeenCalledOnce();
		const [projectId, request, authorship, launch, attachments] = mocks.startThread.mock.calls[0];
		expect(projectId).toBe('p1');
		expect(request).toContain(
			'The node "Fetch new orders" failed in the workflow "Sync orders to CRM" (workflow id: w1).',
		);
		expect(request).toContain('Execution id: 42');
		expect(request).toContain('Error: The resource you are requesting could not be found');
		expect(request).toContain('Details: 404 - Not Found');
		expect(request).toContain('- [Orders runbook](/page/page-1)');
		expect(request).toContain('- [Daily sales report](/page/page-2)');
		expect(request).toContain('Read the runbook pages first.');
		expect(request).toContain('Cite each runbook page that you use as a link.');
		expect(authorship).toEqual({ kind: 'prefill', prefillType: 'handoff_execution_error' });
		expect(launch).toEqual({
			source: 'node_error_view',
			origin: 'internal',
			sourceContext: { workflowId: 'w1' },
		});
		expect(attachments).toEqual([{ type: 'workflow', id: 'w1', name: 'Sync orders to CRM' }]);
	});
});
