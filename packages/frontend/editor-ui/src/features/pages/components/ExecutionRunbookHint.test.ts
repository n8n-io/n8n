import type { PageSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { ExecutionStatus } from 'n8n-workflow';
import { ref, type Ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';

import { usePagePeekStore } from '../pagePeek.store';
import ExecutionRunbookHint from './ExecutionRunbookHint.vue';

const mocks = vi.hoisted(() => ({ useErrorRunbookPages: vi.fn() }));

vi.mock('../composables/useErrorRunbookPages', () => ({
	useErrorRunbookPages: mocks.useErrorRunbookPages,
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({
		resolve: vi.fn(({ params }: { params: { pageId: string } }) => ({
			href: `/page/${params.pageId}`,
		})),
	}),
}));

const ordersRunbook: PageSummary = {
	id: 'page-1',
	title: 'Orders runbook',
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(ExecutionRunbookHint);

const renderForStatus = (status: ExecutionStatus) =>
	renderComponent({ props: { execution: { workflowId: 'w1', status } } });

const requestedFailure = () => (mocks.useErrorRunbookPages.mock.calls[0][0] as () => unknown)();

describe('ExecutionRunbookHint', () => {
	let peekStore: MockedStore<typeof usePagePeekStore>;
	let pages: Ref<PageSummary[]>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		peekStore = mockedStore(usePagePeekStore);
		pages = ref([ordersRunbook]);
		mocks.useErrorRunbookPages.mockReturnValue(pages);
	});

	it.each<ExecutionStatus>(['error', 'crashed'])(
		'should name the runbook pages of the workflow for an execution with the status %s',
		(status) => {
			const { getByTestId } = renderForStatus(status);

			expect(requestedFailure()).toEqual({ workflowId: 'w1' });
			expect(getByTestId('execution-runbook-hint')).toHaveTextContent('Runbook:');
			expect(getByTestId('execution-runbook-hint-page')).toHaveTextContent('Orders runbook');
			expect(getByTestId('execution-runbook-hint-page')).toHaveAttribute('href', '/page/page-1');
		},
	);

	it('should ask for no page for an execution that did not fail', () => {
		renderForStatus('success');

		expect(requestedFailure()).toEqual({});
	});

	it('should render nothing without a runbook page', () => {
		pages.value = [];

		const { queryByTestId } = renderForStatus('error');

		expect(queryByTestId('execution-runbook-hint')).not.toBeInTheDocument();
	});

	it('should show the page in the side panel on a plain click', async () => {
		const { getByTestId } = renderForStatus('error');

		await userEvent.click(getByTestId('execution-runbook-hint-page'));

		expect(peekStore.open).toHaveBeenCalledExactlyOnceWith('page-1');
	});
});
