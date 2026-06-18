import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import ConcurrentExecutionsHeader from './ConcurrentExecutionsHeader.vue';

vi.mock('vue-router', () => {
	return {
		useRouter: vi.fn(),
		useRoute: vi.fn(),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(ConcurrentExecutionsHeader, {
	pinia: createTestingPinia(),
});

describe('ConcurrentExecutionsHeader', () => {
	it('should not throw error when rendered', async () => {
		expect(() =>
			renderComponent({
				props: {
					runningExecutionsCount: 0,
					concurrencyCap: 0,
				},
			}),
		).not.toThrow();
	});

	it('renders nothing when there are no concurrent executions', () => {
		const { queryByTestId } = renderComponent({
			props: {
				runningExecutionsCount: 0,
				concurrencyCap: 5,
			},
		});

		expect(queryByTestId('concurrent-executions-header')).toBeNull();
	});

	it('shows the concurrency count when there are running executions', () => {
		const { getByText } = renderComponent({
			props: {
				runningExecutionsCount: 2,
				concurrencyCap: 5,
			},
		});

		expect(getByText('2/5 active')).toBeVisible();
	});

	it('should show tooltip on hover with Upgrade link when on cloud', async () => {
		const { container } = renderComponent({
			props: {
				runningExecutionsCount: 2,
				concurrencyCap: 5,
				isCloudDeployment: true,
			},
		});

		const tooltipTrigger = container.querySelector('svg');
		if (!tooltipTrigger) throw new Error('SVG trigger not found');

		expect(tooltipTrigger).toBeVisible();

		await hoverTooltipTrigger(tooltipTrigger);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('2 out of 5');
			expect(tooltip).toHaveTextContent('Upgrade now');
		});
	});

	it('should show tooltip on hover with View docs link when self-hosted', async () => {
		const { container } = renderComponent({
			props: {
				runningExecutionsCount: 2,
				concurrencyCap: 5,
			},
		});

		const tooltipTrigger = container.querySelector('svg');
		if (!tooltipTrigger) throw new Error('SVG trigger not found');

		expect(tooltipTrigger).toBeVisible();

		await hoverTooltipTrigger(tooltipTrigger);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('2 out of 5');
			expect(tooltip).toHaveTextContent('View docs');
		});
	});
});
