import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import GenerateMockDataHeader from './GenerateMockDataHeader.vue';

const renderComponent = createComponentRenderer(GenerateMockDataHeader, {
	global: {
		plugins: [createTestingPinia()],
	},
});

describe('GenerateMockDataHeader', () => {
	it('renders mode controls and generate button', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				mode: 'success',
				scenarioText: '',
				isGenerating: false,
			},
		});

		expect(getByTestId('generate-mock-data-header')).toBeInTheDocument();
		expect(getByTestId('generate-mock-data-mode')).toBeInTheDocument();
		expect(getByTestId('generate-mock-data-button')).toBeInTheDocument();
		expect(queryByTestId('generate-mock-data-scenario')).not.toBeInTheDocument();
	});

	it('describes the selected mode', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: {
				mode: 'success',
				scenarioText: '',
				isGenerating: false,
			},
		});

		expect(getByTestId('generate-mock-data-mode-description')).toHaveTextContent(
			'successful run of this node',
		);

		await rerender({ mode: 'failure' });

		expect(getByTestId('generate-mock-data-mode-description')).toHaveTextContent(
			'error this node can return',
		);
	});

	it('shows scenario input when describe mode is selected', () => {
		const { getByTestId } = renderComponent({
			props: {
				mode: 'describe',
				scenarioText: 'failed payment',
				isGenerating: false,
			},
		});

		expect(getByTestId('generate-mock-data-scenario')).toBeInTheDocument();
	});

	it('focuses the scenario input and generates on Enter', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				mode: 'describe',
				scenarioText: 'failed payment',
				isGenerating: false,
			},
		});

		await waitFor(() => expect(getByTestId('generate-mock-data-scenario')).toHaveFocus());

		await userEvent.keyboard('{Enter}');
		expect(emitted().generate).toHaveLength(1);
	});

	it('does not generate on Enter while already generating', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				mode: 'describe',
				scenarioText: 'failed payment',
				isGenerating: true,
			},
		});

		await userEvent.type(getByTestId('generate-mock-data-scenario'), '{Enter}');
		expect(emitted().generate).toBeUndefined();
	});

	it('emits generate when the button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				mode: 'success',
				scenarioText: '',
				isGenerating: false,
			},
		});

		await userEvent.click(getByTestId('generate-mock-data-button'));
		expect(emitted().generate).toHaveLength(1);
	});

	it('disables generate while loading', () => {
		const { getByTestId } = renderComponent({
			props: {
				mode: 'success',
				scenarioText: '',
				isGenerating: true,
			},
		});

		expect(getByTestId('generate-mock-data-button')).toBeDisabled();
	});
});
