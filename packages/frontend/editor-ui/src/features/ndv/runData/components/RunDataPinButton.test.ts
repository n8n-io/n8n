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
		disabledTooltip: "This execution is read-only. You can't pin or unpin data here.",
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

	it.each([false, true])('explains disabled pinning on hover when pinned=%s', async (pinned) => {
		const { getByRole, emitted } = renderComponent({
			props: {
				disabled: true,
				pinnedData: { hasData: { value: pinned } } as ReturnType<typeof usePinnedData>,
			},
		});
		const button = getByRole('button');
		expect(button).toHaveAttribute('aria-disabled', 'true');
		expect(button).toHaveAccessibleName(pinned ? 'Unpin data' : 'Pin data');
		await userEvent.hover(button);
		await waitFor(() =>
			expect(getTooltip()).toHaveTextContent(
				"This execution is read-only. You can't pin or unpin data here.",
			),
		);
		await userEvent.click(button);
		expect(emitted('togglePinData')).toBeUndefined();
	});

	it('explains disabled pinning on keyboard focus without allowing activation', async () => {
		const { getByRole, emitted } = renderComponent({ props: { disabled: true } });
		await userEvent.tab();
		expect(getByRole('button')).toHaveFocus();
		await waitFor(() => expect(getTooltip()).toHaveTextContent('This execution is read-only.'));

		await userEvent.keyboard('{Enter} ');
		expect(emitted('togglePinData')).toBeUndefined();
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(queryTooltip()).not.toBeInTheDocument());
	});

	it('suppresses discovery when pinning is disabled', async () => {
		const { getByRole } = renderComponent({
			props: {
				disabled: true,
				tooltipContentsVisibility: {
					binaryDataTooltipContent: false,
					pinDataDiscoveryTooltipContent: true,
				},
			},
		});
		expect(queryTooltip()).not.toBeInTheDocument();
		await userEvent.hover(getByRole('button'));
		await waitFor(() => expect(getTooltip()).toHaveTextContent('This execution is read-only.'));
		expect(getTooltip()).not.toHaveTextContent('instead of waiting');
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

		expect(queryTooltip()).not.toBeInTheDocument();
		expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');

		await userEvent.hover(getByRole('button'));

		await waitFor(() => expect(getTooltip()).toHaveTextContent(/binary data/));
		expect(getTooltip()).not.toHaveTextContent('This execution is read-only.');
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
