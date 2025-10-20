import { createTestingPinia } from '@pinia/testing';
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import RunDataPinButton from '@/components/RunDataPinButton.vue';
import { STORES } from '@n8n/stores';
import type { usePinnedData } from '@/composables/usePinnedData';

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
		const { getByRole, queryByRole, emitted } = renderComponent();

		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		expect(getByRole('button')).toBeEnabled();
		await userEvent.hover(getByRole('button'));

		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('More info');

		await userEvent.click(getByRole('button'));
		expect(emitted().togglePinData).toBeDefined();
	});

	it('shows binary data tooltip content only on disabled button hover', async () => {
		const { getByRole, queryByRole, emitted } = renderComponent({
			props: {
				tooltipContentsVisibility: {
					binaryDataTooltipContent: true,
					pinDataDiscoveryTooltipContent: false,
				},
				disabled: true,
			},
		});

		expect(queryByRole('tooltip')).not.toBeInTheDocument();
		expect(getByRole('button')).toBeDisabled();

		await userEvent.hover(getByRole('button'));

		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('disabled');

		await userEvent.click(getByRole('button'));
		expect(emitted().togglePinData).not.toBeDefined();
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
			expect(getByRole('tooltip')).toBeVisible();
			expect(getByRole('tooltip')).toHaveTextContent('instead of waiting');
		});
		expect(getByRole('button')).toBeEnabled();

		await userEvent.hover(getByRole('button'));

		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('instead of waiting');
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
			expect(getByRole('tooltip')).toBeVisible();
			expect(getByRole('tooltip')).toHaveTextContent('disabled');
		});
		expect(getByRole('button')).toBeDisabled();

		await userEvent.hover(getByRole('button'));

		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('disabled');
	});

	it('pins data on button click', async () => {
		const { getByTestId, getByRole, emitted } = renderComponent({});
		// Should show 'Pin data' tooltip and emit togglePinData event
		await userEvent.hover(getByTestId('ndv-pin-data'));
		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip').textContent).toContain('Pin data');
		await userEvent.click(getByTestId('ndv-pin-data'));
		expect(emitted().togglePinData).toBeDefined();
	});

	it('should show correct tooltip and unpin data on button click', async () => {
		const { getByTestId, getByRole, emitted } = renderComponent({
			props: {
				pinnedData: {
					hasData: { value: true },
				} as ReturnType<typeof usePinnedData>,
			},
		});
		// Should show 'Unpin data' tooltip and emit togglePinData event
		await userEvent.hover(getByTestId('ndv-pin-data'));
		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip').textContent).toContain('Unpin data');
		await userEvent.click(getByTestId('ndv-pin-data'));
		expect(emitted().togglePinData).toBeDefined();
	});
});
