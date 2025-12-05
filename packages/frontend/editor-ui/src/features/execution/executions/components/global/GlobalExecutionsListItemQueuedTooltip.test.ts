import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
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
		const { getByText, baseElement } = renderComponent({
			props: {
				status: 'waiting',
				concurrencyCap: 0,
			},
			slots: {
				default: '<span>Waiting</span>',
			},
		});

		await userEvent.hover(getByText('Waiting'));

		await waitFor(() => {
			const tooltip = baseElement.ownerDocument.querySelector('[data-dismissable-layer]');
			expect(tooltip).toHaveTextContent(/waiting indefinitely/);
		});
	});

	it('should show queued tooltip for self-hosted', async () => {
		const { getByText, baseElement } = renderComponent({
			props: {
				status: 'new',
				concurrencyCap: 0,
			},
			slots: {
				default: '<span>Queued</span>',
			},
		});

		await userEvent.hover(getByText('Queued'));

		await waitFor(() => {
			const tooltip = baseElement.ownerDocument.querySelector('[data-dismissable-layer]');
			expect(tooltip).toHaveTextContent(/instance is limited/);
			expect(tooltip).toHaveTextContent('View docs');
		});
	});

	it('should show queued tooltip for cloud', async () => {
		const { getByText, emitted, baseElement } = renderComponent({
			props: {
				status: 'new',
				concurrencyCap: 0,
				isCloudDeployment: true,
			},
			slots: {
				default: '<span>Queued</span>',
			},
		});

		await userEvent.hover(getByText('Queued'));

		let tooltipElement: HTMLElement | null = null;
		await waitFor(() => {
			tooltipElement = baseElement.ownerDocument.querySelector('[data-dismissable-layer]');
			expect(tooltipElement).toHaveTextContent(/plan is limited/);
			expect(tooltipElement).toHaveTextContent('Upgrade now');
		});

		await userEvent.click(within(tooltipElement!).getByText('Upgrade now'));

		expect(emitted().goToUpgrade).toHaveLength(1);
	});
});
