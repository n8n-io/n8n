import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import GlobalExecutionsListItemQueuedTooltip from '@/components/executions/global/GlobalExecutionsListItemQueuedTooltip.vue';

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
					default: 'Waiting',
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
				default: 'Waiting',
			},
		});

		await userEvent.hover(getByText('Waiting'));

		expect(getByText(/waiting indefinitely/)).toBeVisible();
	});

	it('should show queued tooltip for self-hosted', async () => {
		const { getByText } = renderComponent({
			props: {
				status: 'new',
				concurrencyCap: 0,
			},
			slots: {
				default: 'Queued',
			},
		});

		await userEvent.hover(getByText('Queued'));

		expect(getByText(/instance is limited/)).toBeVisible();
		expect(getByText('View docs')).toBeVisible();
	});

	it('should show queued tooltip for cloud', async () => {
		const { getByText, emitted } = renderComponent({
			props: {
				status: 'new',
				concurrencyCap: 0,
				isCloudDeployment: true,
			},
			slots: {
				default: 'Queued',
			},
		});

		await userEvent.hover(getByText('Queued'));

		expect(getByText(/plan is limited/)).toBeVisible();
		expect(getByText('Upgrade now')).toBeVisible();

		await userEvent.click(getByText('Upgrade now'));

		expect(emitted().goToUpgrade).toHaveLength(1);
	});
});
