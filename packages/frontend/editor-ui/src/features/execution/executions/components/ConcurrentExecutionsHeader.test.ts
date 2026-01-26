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
				},
			});

			expect(getByText(text)).toBeVisible();
		},
	);

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
