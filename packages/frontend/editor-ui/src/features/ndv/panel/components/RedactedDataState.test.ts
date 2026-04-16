import { createComponentRenderer } from '@/__tests__/render';
import RedactedDataState from './RedactedDataState.vue';

const renderComponent = createComponentRenderer(RedactedDataState);

describe('RedactedDataState', () => {
	it('should render title', () => {
		const { getByText, getByTestId } = renderComponent({
			props: { title: 'Data is redacted', isDynamicCredentials: false, canReveal: false },
		});

		expect(getByTestId('ndv-data-redacted')).toBeInTheDocument();
		expect(getByText('Data is redacted')).toBeInTheDocument();
	});

	it('should show dynamic credentials description when isDynamicCredentials is true', () => {
		const { getByText, queryByText } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: true, canReveal: false },
		});

		expect(
			getByText(
				'This execution used dynamic credentials. Data from dynamic credential executions cannot be revealed.',
			),
		).toBeInTheDocument();
		expect(queryByText('Execution data has been redacted.')).not.toBeInTheDocument();
	});

	it('should show standard description with workflow settings link when isDynamicCredentials is false', () => {
		const { getByText } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: false },
		});

		expect(getByText('Execution data has been redacted.')).toBeInTheDocument();
		expect(getByText('workflow settings')).toBeInTheDocument();
	});

	it('should show reveal button when canReveal is true', () => {
		const { getByTestId } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: true },
		});

		expect(getByTestId('ndv-reveal-redacted-data')).toBeInTheDocument();
	});

	it('should not show reveal button when canReveal is false', () => {
		const { queryByTestId } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: false },
		});

		expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
	});

	it('should emit "reveal" when reveal button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: true },
		});

		getByTestId('ndv-reveal-redacted-data').click();

		expect(emitted('reveal')).toHaveLength(1);
	});

	it('should emit "openSettings" when workflow settings link is clicked', async () => {
		const { getByText, emitted } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: false },
		});

		getByText('workflow settings').click();

		expect(emitted('openSettings')).toHaveLength(1);
	});
});
