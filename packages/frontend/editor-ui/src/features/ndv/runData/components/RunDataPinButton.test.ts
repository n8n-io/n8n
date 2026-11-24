import { createTestingPinia } from '@pinia/testing';
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, queryTooltip } from '@/__tests__/utils';
import RunDataPinButton from '@/features/ndv/runData/components/RunDataPinButton.vue';
import { STORES } from '@n8n/stores';
import type { usePinnedData } from '@/app/composables/usePinnedData';

const renderComponent = createComponentRenderer(RunDataPinButton, {
	global: {
		plugins: [
			createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: {
						settings: {
							templates: {
								enabled: true,
								host: 'https://api.n8n.io/api/',
							},
						},
					},
				},
			}),
		],
	},
	props: {
		tooltipContentsVisibility: {
			binaryDataTooltipContent: false,
			pinDataDiscoveryTooltipContent: false,
		},
		dataPinningDocsUrl: '',
		pinnedData: {
			hasData: { value: false },
		} as ReturnType<typeof usePinnedData>,
		disabled: false,
	},
});

describe('RunDataPinButton.vue', () => {
	beforeEach(cleanup);

	it('shows default tooltip content only on button hover', async () => {
		const { getByRole, emitted } = renderComponent();

		expect(getByRole('button')).toBeEnabled();
		// Verify tooltip is not visible before hover
		expect(queryTooltip()).not.toBeInTheDocument();

		await userEvent.hover(getByRole('button'));

		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('More info');
		});

		await userEvent.click(getByRole('button'));
		expect(emitted().togglePinData).toBeDefined();
	});

	it('shows binary data tooltip content only on disabled button hover', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				tooltipContentsVisibility: {
					binaryDataTooltipContent: true,
					pinDataDiscoveryTooltipContent: false,
				},
				disabled: true,
			},
		});

		expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');
		// Verify tooltip is not visible before hover
		expect(queryTooltip()).not.toBeInTheDocument();

		await userEvent.hover(getByRole('button'));

		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent(/disabled/);
		});

		await userEvent.click(getByRole('button'));
		expect(emitted().togglePinData).not.toBeDefined();
	});

	it('keeps the tooltip trigger around a natively disabled pin button', async () => {
		const { getByRole, emitted } = renderComponent({ props: { disabled: true } });
		const button = getByRole('button');
		expect(button).toBeDisabled();
		await userEvent.hover(button.parentElement!);
		await waitFor(() => expect(getTooltip()).toHaveTextContent('Pin data'));
		await userEvent.click(button);
		expect(emitted('togglePinData')).toBeUndefined();
	});

	it('shows pin data discoverability tooltip immediately (not on hover)', async () => {
		const { getByRole } = renderComponent({
			props: {
				tooltipContentsVisibility: {
					binaryDataTooltipContent: false,
					pinDataDiscoveryTooltipContent: true,
				},
			},
		});

		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent(/instead of waiting/);
		});
		expect(getByRole('button')).toBeEnabled();

		await userEvent.hover(getByRole('button'));

		const tooltip = getTooltip();
		expect(tooltip).toHaveTextContent(/instead of waiting/);
	});

	it('shows binary data tooltip content even if discoverability tooltip enabled', async () => {
		const { getByRole } = renderComponent({
			props: {
				tooltipContentsVisibility: {
					binaryDataTooltipContent: true,
					pinDataDiscoveryTooltipContent: true,
				},
				disabled: true,
			},
		});

		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent(/disabled/);
		});
		expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');

		await userEvent.hover(getByRole('button'));

		const tooltip = getTooltip();
		expect(tooltip).toHaveTextContent(/disabled/);
	});

	it('pins data on button click', async () => {
		const { getByTestId, emitted } = renderComponent({});
		// Should show 'Pin data' tooltip and emit togglePinData event
		await userEvent.hover(getByTestId('ndv-pin-data'));
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent(/Pin data/);
		});
		await userEvent.click(getByTestId('ndv-pin-data'));
		expect(emitted().togglePinData).toBeDefined();
	});

	it('should show correct tooltip and unpin data on button click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				pinnedData: {
					hasData: { value: true },
				} as ReturnType<typeof usePinnedData>,
			},
		});
		// Should show 'Unpin data' tooltip and emit togglePinData event
		await userEvent.hover(getByTestId('ndv-pin-data'));
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent(/Unpin data/);
		});
		await userEvent.click(getByTestId('ndv-pin-data'));
		expect(emitted().togglePinData).toBeDefined();
	});
});
