import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ConcurrentExecutionsHeader from '@/components/executions/ConcurrentExecutionsHeader.vue';

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
		[2, 5, '2/5 active executions'],
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

	it('should show tooltip on hover with Upgrade link and emit "goToUpgrade" on click when on cloud', async () => {
		const { container, getByText, getByRole, queryByRole, emitted } = renderComponent({
			props: {
				runningExecutionsCount: 2,
				concurrencyCap: 5,
				isCloudDeployment: true,
			},
		});

		const tooltipTrigger = container.querySelector('svg') as SVGSVGElement;

		expect(tooltipTrigger).toBeVisible();
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(tooltipTrigger);

		expect(getByRole('tooltip')).toBeVisible();
		expect(getByText('Upgrade now')).toBeVisible();

		await userEvent.click(getByText('Upgrade now'));

		expect(emitted().goToUpgrade).toHaveLength(1);
	});

	it('should show tooltip on hover with Viev docs link when self-hosted', async () => {
		const { container, getByText, getByRole, queryByRole } = renderComponent({
			props: {
				runningExecutionsCount: 2,
				concurrencyCap: 5,
			},
		});

		const tooltipTrigger = container.querySelector('svg') as SVGSVGElement;

		expect(tooltipTrigger).toBeVisible();
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(tooltipTrigger);

		expect(getByRole('tooltip')).toBeVisible();
		expect(getByText('View docs')).toBeVisible();
	});
});
