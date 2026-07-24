import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useToast } from '@/app/composables/useToast';

import { useReviewInboxStore } from '../reviewInbox.store';
import WorkflowReviewRequestsView from './WorkflowReviewRequestsView.vue';

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

const showError = vi.fn();

const renderComponent = createComponentRenderer(WorkflowReviewRequestsView, {
	global: {
		stubs: {
			PageViewLayout: {
				template: '<div data-test-id="workflow-review-requests-view"><slot /></div>',
			},
			WorkflowReviewRequestsSidebar: {
				template: '<div data-test-id="workflow-review-requests-sidebar" />',
			},
		},
	},
});

describe('WorkflowReviewRequestsView', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewInboxStore>>;

	beforeEach(() => {
		createTestingPinia();
		showError.mockReset();
		vi.mocked(useToast).mockReturnValue({ showError } as unknown as ReturnType<typeof useToast>);

		store = mockedStore(useReviewInboxStore);
		store.probeSettled = false;
		store.showSidebar = false;
		store.selectedItem = null;
		store.items = [];
		store.activeState = 'open';
		store.selectedId = null;
		store.loading = false;
		store.loadingMore = false;
		store.hasMore = false;
		store.isEmpty = false;
		store.probeInbox.mockResolvedValue(undefined);
		store.reset.mockClear();
	});

	it('probes the inbox on mount', async () => {
		renderComponent();
		await waitAllPromises();

		expect(store.probeInbox).toHaveBeenCalledTimes(1);
	});

	it('shows loading while the inbox probe has not settled', async () => {
		store.probeSettled = false;

		const { container, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		expect(queryByTestId('workflow-reviews-disclaimer')).not.toBeInTheDocument();
	});

	it('shows the disclaimer when settled with nothing selected', async () => {
		store.probeSettled = true;
		store.showSidebar = false;
		store.selectedItem = null;

		const { container, getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('workflow-reviews-disclaimer')).toBeInTheDocument();
		expect(container.querySelector('.n8n-loading')).not.toBeInTheDocument();
		expect(queryByTestId('workflow-review-requests-sidebar')).not.toBeInTheDocument();
	});

	it('renders the sidebar and selected title when a review is selected', async () => {
		store.probeSettled = true;
		store.showSidebar = true;
		store.selectedItem = {
			id: 'req-1',
			projectId: 'proj-1',
			title: 'Needs review',
			workflowName: 'My workflow',
			decision: 'pending',
			state: 'open',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('workflow-review-requests-sidebar')).toBeInTheDocument();
		expect(getByTestId('workflow-review-request-title')).toHaveTextContent('Needs review');
		expect(getByTestId('workflow-review-request-detail-stub')).toBeInTheDocument();
	});

	it('shows an error toast when probing the inbox fails', async () => {
		const error = new Error('network');
		store.probeInbox.mockRejectedValueOnce(error);

		renderComponent();
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(error, 'Could not load workflow reviews');
	});

	it('does not toast probe errors after unmount', async () => {
		let rejectProbe!: (error: Error) => void;
		store.probeInbox.mockImplementationOnce(
			async () =>
				await new Promise<void>((_resolve, reject) => {
					rejectProbe = reject;
				}),
		);

		const { unmount } = renderComponent();
		unmount();
		rejectProbe(new Error('network'));
		await waitAllPromises();

		expect(showError).not.toHaveBeenCalled();
	});

	it('resets the store on unmount', async () => {
		const { unmount } = renderComponent();
		await waitAllPromises();

		unmount();

		expect(store.reset).toHaveBeenCalledTimes(1);
	});
});
