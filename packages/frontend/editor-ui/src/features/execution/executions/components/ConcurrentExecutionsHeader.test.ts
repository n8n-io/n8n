import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import ConcurrentExecutionsHeader from './ConcurrentExecutionsHeader.vue';
import { ExecutionSummary } from 'n8n-workflow';

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
	props: {
		executions: [],
		isInitialLoad: false,
	},
});

describe('ConcurrentExecutionsHeader', () => {
	it('should not throw error when rendered', async () => {
		expect(() =>
			renderComponent({
				props: {
					runningExecutionsCount: 0,
					concurrencyCap: 0,
					executions: [],
					isInitialLoad: false,
				},
			}),
		).not.toThrow();
	});

	test.each([
		[0, 5, 'No active executions'],
		[2, 5, '2/5 active'],
	])(
		'shows the correct text when there are %i running executions of %i',
		async (runningExecutionsCount, concurrencyCap, text) => {
			const { getByText } = renderComponent({
				props: {
					runningExecutionsCount,
					concurrencyCap,
					executions: [],
					isInitialLoad: false,
				},
			});

			expect(getByText(text)).toBeVisible();
		},
	);

	it('hides the concurrency header until the initial load completes', () => {
		const { queryByTestId } = renderComponent({
			props: {
				runningExecutionsCount: 0,
				concurrencyCap: 5,
				executions: [],
				isInitialLoad: true,
			},
		});

		expect(queryByTestId('concurrent-executions-header')).not.toBeInTheDocument();
	});

	it('shows the concurrency header for a settled empty result', () => {
		const { getByTestId } = renderComponent({
			props: {
				runningExecutionsCount: 0,
				concurrencyCap: 5,
				executions: [],
				isInitialLoad: false,
			},
		});

		expect(getByTestId('concurrent-executions-header')).toBeVisible();
	});

	it('hides the concurrency header when count is 0 but a manual run is active', () => {
		const { queryByTestId } = renderComponent({
			props: {
				runningExecutionsCount: 0,
				concurrencyCap: 5,
				executions: [{ status: 'running' } as ExecutionSummary],
				isInitialLoad: false,
			},
		});

		expect(queryByTestId('concurrent-executions-header')).not.toBeInTheDocument();
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
