import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip } from '@/__tests__/utils';
import RunDataGenerateSampleButton from '@/features/ndv/runData/components/RunDataGenerateSampleButton.vue';

const renderComponent = createComponentRenderer(RunDataGenerateSampleButton, {
	global: {
		plugins: [
			createTestingPinia({
				initialState: { [STORES.SETTINGS]: { settings: {} } },
			}),
		],
	},
	props: { loading: false, disabled: false },
});

describe('RunDataGenerateSampleButton.vue', () => {
	beforeEach(cleanup);

	it('renders an enabled button with the correct testid', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('ndv-generate-sample-data')).toBeEnabled();
	});

	it('emits generate on click', async () => {
		const { getByTestId, emitted } = renderComponent();
		await userEvent.click(getByTestId('ndv-generate-sample-data'));
		expect(emitted().generate).toBeDefined();
	});

	it('does not emit when disabled', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { disabled: true, loading: false },
		});
		await userEvent.click(getByTestId('ndv-generate-sample-data'));
		expect(emitted().generate).toBeUndefined();
	});

	it('renders in loading state', () => {
		const { getByTestId } = renderComponent({ props: { loading: true, disabled: false } });
		expect(getByTestId('ndv-generate-sample-data')).toBeDisabled();
	});

	it('shows tooltip on hover', async () => {
		const { getByTestId } = renderComponent();
		await userEvent.hover(getByTestId('ndv-generate-sample-data'));
		await waitFor(() => {
			expect(getTooltip()).toHaveTextContent(/Generate sample data/);
		});
	});
});
