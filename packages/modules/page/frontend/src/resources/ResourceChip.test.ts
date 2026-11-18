import { componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import ResourceChip from './ResourceChip.vue';
import type { ResourceFetchers } from './resourceNameResolver';
import { createTestRouter } from '../__tests__/router';
import { RESOURCE_PREVIEW_DELAY_MS } from '../page.constants';

const fetchers = vi.hoisted(() => ({
	workflow: vi.fn<ResourceFetchers['workflow']>(),
	credential: vi.fn<ResourceFetchers['credential']>(),
	dataTable: vi.fn<ResourceFetchers['dataTable']>(),
	page: vi.fn<ResourceFetchers['page']>(),
}));

vi.mock('./resource.api', () => ({
	createRestResourceFetchers: () => fetchers,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

const renderChip = createComponentRenderer(ResourceChip);

const NodeIconStub = defineComponent({
	props: { nodeType: { type: String, required: true } },
	setup: (props) => () => h('i', { 'data-test-id': 'node-icon-stub' }, props.nodeType),
});

const WORKFLOW_WITH_SLACK_NODE = {
	name: 'Sync orders',
	nodes: [{ id: 'node-1', name: 'Notify team', type: 'n8n-nodes-base.slack' }],
};

function renderChipFor(href: string, label: string) {
	const router = createTestRouter();
	const wrapper = renderChip({ props: { href, label }, global: { plugins: [router] } });
	return { wrapper, router };
}

async function restPointerOn(element: HTMLElement) {
	await fireEvent.pointerEnter(element, { pointerType: 'mouse' });
}

describe('ResourceChip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchers.workflow.mockResolvedValue({
			name: 'Sync orders',
			active: true,
			updatedAt: '2026-11-16T10:00:00.000Z',
			nodes: [],
		});
		fetchers.page.mockResolvedValue({ name: '🚀 Launch plan' });
		fetchers.credential.mockRejectedValue(new Error('Forbidden'));
	});

	afterEach(() => {
		componentRegistry.clear();
	});

	it('shows the icon of the node type for a node when the app provides node icons', async () => {
		componentRegistry.register('node-icon', NodeIconStub);
		fetchers.workflow.mockResolvedValue(WORKFLOW_WITH_SLACK_NODE);

		const { wrapper } = renderChipFor('/workflow/abc123/node-1', 'Notify team');

		await waitFor(() =>
			expect(wrapper.getByTestId('node-icon-stub')).toHaveTextContent('n8n-nodes-base.slack'),
		);
	});

	it('keeps the generic node icon when the app provides no node icons', async () => {
		fetchers.workflow.mockResolvedValue(WORKFLOW_WITH_SLACK_NODE);

		const { wrapper } = renderChipFor('/workflow/abc123/node-1', 'Notify team');
		const chip = wrapper.getByTestId('page-resource-chip');

		await waitFor(() => expect(chip).toHaveTextContent('Sync orders › Notify team'));
		expect(wrapper.queryByTestId('node-icon-stub')).toBeNull();
		expect(chip.querySelector('svg')).not.toBeNull();
	});

	it('shows the emoji of a page title in place of the page icon', async () => {
		const { wrapper } = renderChipFor('/page/p1', 'Launch plan');

		const chip = wrapper.getByTestId('page-resource-chip');
		await waitFor(() => expect(wrapper.getByTestId('page-resource-emoji')).toHaveTextContent('🚀'));

		expect(chip).toHaveTextContent('Launch plan');
		expect(chip.querySelector('svg')).toBeNull();
	});

	it('shows a preview with an open link when the pointer rests on the chip', async () => {
		const { wrapper, router } = renderChipFor('/workflow/abc123', 'Sync');
		const chip = wrapper.getByTestId('page-resource-chip');
		await waitFor(() => expect(chip).toHaveTextContent('Sync orders'));

		await restPointerOn(chip);

		const preview = await screen.findByTestId(
			'page-resource-preview',
			{},
			{ timeout: RESOURCE_PREVIEW_DELAY_MS * 4 },
		);
		expect(preview).toHaveTextContent('Workflow');
		expect(preview).toHaveTextContent('Active');

		await fireEvent.click(screen.getByTestId('page-resource-preview-open'));

		await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/workflow/abc123'));
	});

	it('shows no preview for a resource that cannot be read', async () => {
		const { wrapper } = renderChipFor('/home/credentials/c1', 'Stripe key');
		const chip = wrapper.getByTestId('page-resource-chip');
		await waitFor(() => expect(chip.className).toContain('missing'));

		await restPointerOn(chip);
		await new Promise((resolve) => setTimeout(resolve, RESOURCE_PREVIEW_DELAY_MS * 2));

		expect(screen.queryByTestId('page-resource-preview')).not.toBeInTheDocument();
		expect(chip).toHaveTextContent('Stripe key');
	});
});
