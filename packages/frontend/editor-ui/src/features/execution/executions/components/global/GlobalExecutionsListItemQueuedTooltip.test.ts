import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import GlobalExecutionsListItemQueuedTooltip from './GlobalExecutionsListItemQueuedTooltip.vue';

const renderComponent = createComponentRenderer(GlobalExecutionsListItemQueuedTooltip);

describe('GlobalExecutionsListItemQueuedTooltip', () => {
	it('should not throw error when rendered', async () => {
		expect(() =>
			renderComponent({
				props: {
					status: 'waiting',
					concurrencyCap: 0,
				},
				slots: {
					default: '<span>Waiting</span>',
				},
			}),
		).not.toThrow();
	});

	it('should show waiting indefinitely tooltip', async () => {
		const { getByText } = renderComponent({
			props: {
				status: 'waiting',
				concurrencyCap: 0,
			},
			slots: {
				default: '<span>Waiting</span>',
			},
		});

		// Verify slot content is rendered
		const slotContent = getByText('Waiting');
		expect(slotContent).toBeInTheDocument();

		// Hover and verify tooltip content
		await hoverTooltipTrigger(slotContent);
		await waitFor(() =>
			expect(getTooltip()).toHaveTextContent('waiting indefinitely for an incoming webhook'),
		);
	});

	it('should show queued tooltip for self-hosted', async () => {
		const { getByText } = renderComponent({
			props: {
				status: 'new',
				concurrencyCap: 5,
			},
			slots: {
				default: '<span>Queued</span>',
			},
		});

		// Verify slot content is rendered
		const slotContent = getByText('Queued');
		expect(slotContent).toBeInTheDocument();

		// Hover and verify tooltip content
		await hoverTooltipTrigger(slotContent);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('concurrency capacity is available');
			expect(tooltip).toHaveTextContent('View docs');
		});
	});

	it('should show queued tooltip for cloud', async () => {
		const { getByText } = renderComponent({
			props: {
				status: 'new',
				concurrencyCap: 5,
				isCloudDeployment: true,
			},
			slots: {
				default: '<span>Queued</span>',
			},
		});

		// Verify slot content is rendered
		const slotContent = getByText('Queued');
		expect(slotContent).toBeInTheDocument();

		// Hover and verify tooltip content
		await hoverTooltipTrigger(slotContent);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('concurrency capacity is available');
			expect(tooltip).toHaveTextContent('Upgrade now');
		});
	});
});
