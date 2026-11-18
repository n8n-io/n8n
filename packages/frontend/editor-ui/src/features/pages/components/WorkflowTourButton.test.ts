import type { PageSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';

import { useNodePagesStore } from '../nodePages.store';
import WorkflowTourButton from './WorkflowTourButton.vue';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({ query: { tab: 'editor' } }),
	useRouter: vi.fn().mockReturnValue({ push: vi.fn().mockResolvedValue(undefined) }),
}));

const runbook: PageSummary = {
	id: 'page-1',
	title: 'Runbook',
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-02T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(WorkflowTourButton, {
	props: { workflowId: 'w1' },
});

describe('WorkflowTourButton', () => {
	let nodePagesStore: ReturnType<typeof useNodePagesStore>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		nodePagesStore = useNodePagesStore();
		nodePagesStore.workflowId = 'w1';
	});

	it('should render nothing when no page links to a node of the workflow', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('workflow-take-tour-button')).not.toBeInTheDocument();
	});

	it('should ask the canvas to start the tour of the page and keep the address', async () => {
		nodePagesStore.pagesByNodeId = { a: [runbook] };
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('workflow-take-tour-button'));

		expect(useRouter().push).toHaveBeenCalledWith({ query: { tab: 'editor', pageTour: 'page-1' } });
	});
});
