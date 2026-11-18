import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';

import ResourcePreviewCard from './ResourcePreviewCard.vue';

const renderCard = createComponentRenderer(ResourcePreviewCard);

describe('ResourcePreviewCard', () => {
	it('shows the type, the name, the state and the last change of a workflow', () => {
		const { getByTestId } = renderCard({
			props: {
				resourceType: 'workflow',
				details: { name: 'Sync orders', isActive: true, updatedAt: '2026-11-16T10:00:00.000Z' },
				address: '/workflow/abc123',
			},
		});

		const card = getByTestId('page-resource-preview');
		expect(card).toHaveTextContent('Workflow');
		expect(card).toHaveTextContent('Sync orders');
		expect(getByTestId('page-resource-preview-activity')).toHaveTextContent('Active');
		expect(getByTestId('page-resource-preview-updated')).toHaveTextContent('Updated');
	});

	it('shows an inactive workflow as inactive', () => {
		const { getByTestId } = renderCard({
			props: {
				resourceType: 'workflow',
				details: { name: 'Sync orders', isActive: false },
				address: '/workflow/abc123',
			},
		});

		expect(getByTestId('page-resource-preview-activity')).toHaveTextContent('Inactive');
	});

	it('shows a node by its own name and tells its workflow', () => {
		const { getByTestId } = renderCard({
			props: {
				resourceType: 'node',
				details: {
					name: 'Sync orders › HTTP Request',
					nodeName: 'HTTP Request',
					workflowName: 'Sync orders',
					isActive: true,
				},
				address: '/workflow/abc123/node-1',
			},
		});

		const card = getByTestId('page-resource-preview');
		expect(card).toHaveTextContent('Node');
		expect(card).toHaveTextContent('In Sync orders');
		expect(card).not.toHaveTextContent('Sync orders › HTTP Request');
	});

	it('uses the emoji of a page title as its icon, and shows no state', () => {
		const { getByTestId, queryByTestId } = renderCard({
			props: {
				resourceType: 'page',
				details: { name: '🚀 Launch plan', updatedAt: '2026-11-16T10:00:00.000Z' },
				address: '/page/p1',
			},
		});

		expect(getByTestId('page-resource-emoji')).toHaveTextContent('🚀');
		expect(getByTestId('page-resource-preview')).toHaveTextContent('Launch plan');
		expect(queryByTestId('page-resource-preview-activity')).not.toBeInTheDocument();
	});

	it('links to the resource and reports a click on the link', async () => {
		const onOpen = vi.fn((event: MouseEvent) => event.preventDefault());
		const { getByTestId } = renderCard({
			props: {
				resourceType: 'credential',
				details: { name: 'Stripe key' },
				address: '/n8n/home/credentials/c1',
				onOpen,
			},
		});
		const open = getByTestId('page-resource-preview-open');

		await fireEvent.click(open);

		expect(open).toHaveAttribute('href', '/n8n/home/credentials/c1');
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});
