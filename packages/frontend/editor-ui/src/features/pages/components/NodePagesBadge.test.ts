import type { PageSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';

import { useNodePagesStore } from '../nodePages.store';
import NodePagesBadge from './NodePagesBadge.vue';

const workflowId = vi.hoisted(() => ({
	ref: undefined as unknown as { value: string | undefined },
}));

vi.mock('../composables/usePagesWorkflowId', () => ({
	usePagesWorkflowId: () => workflowId.ref,
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({
		push: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn().mockReturnValue({ href: '/page/href' }),
	}),
}));

vi.mock('../composables/useWorkflowPagesProjectId', async () => {
	const { ref: vueRef } = await import('vue');
	return { useWorkflowPagesProjectId: () => vueRef('p1') };
});

vi.mock('@n8n/frontend-module-page', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-page')>()),
	getPagePermissions: () => ({ canCreate: true }),
}));

const toSummary = (id: string, title: string): PageSummary => ({
	id,
	title,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-01T00:00:00.000Z',
});

const runbook = toSummary('page-1', 'Runbook');
const onboarding = toSummary('page-2', 'Onboarding');

const renderComponent = createComponentRenderer(NodePagesBadge, {
	props: { nodeId: 'n1', nodeName: 'HTTP Request' },
});

describe('NodePagesBadge', () => {
	let nodePagesStore: MockedStore<typeof useNodePagesStore>;

	function givenNodePages(pages: PageSummary[]) {
		nodePagesStore.pagesOf.mockImplementation((_, nodeId) => (nodeId === 'n1' ? pages : []));
	}

	beforeEach(() => {
		createTestingPinia();
		workflowId.ref = ref<string | undefined>('w1');
		nodePagesStore = mockedStore(useNodePagesStore);
		givenNodePages([]);
	});

	it('should render nothing for a node that no page links to', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('node-pages-badge')).not.toBeInTheDocument();
	});

	it('should render nothing for a workflow that is not saved', () => {
		workflowId.ref.value = undefined;
		givenNodePages([runbook]);

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('node-pages-badge')).not.toBeInTheDocument();
	});

	it('should show the icon alone for one page', () => {
		givenNodePages([runbook]);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('node-pages-badge')).toBeInTheDocument();
		expect(queryByTestId('node-pages-count')).not.toBeInTheDocument();
	});

	it('should show the count for more than one page', () => {
		givenNodePages([runbook, onboarding]);

		const { getByTestId } = renderComponent();

		expect(getByTestId('node-pages-count')).toHaveTextContent('2');
	});

	it('should list the pages and refresh the workflow on click', async () => {
		givenNodePages([runbook, onboarding]);
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('node-pages-badge'));

		expect(await screen.findAllByTestId('node-pages-item')).toHaveLength(2);
		expect(screen.getByTestId('node-pages-create')).toHaveTextContent('New page for this node');
		expect(nodePagesStore.refresh).toHaveBeenCalledWith('w1');
	});

	it('should keep a click away from the canvas', async () => {
		givenNodePages([runbook]);
		const reachedCanvas = vi.fn();
		const canvas = document.createElement('div');
		canvas.addEventListener('click', reachedCanvas);
		document.body.appendChild(canvas);
		const { getByTestId } = renderComponent({ container: canvas });

		await userEvent.click(getByTestId('node-pages-badge'));

		expect(reachedCanvas).not.toHaveBeenCalled();
	});
});
