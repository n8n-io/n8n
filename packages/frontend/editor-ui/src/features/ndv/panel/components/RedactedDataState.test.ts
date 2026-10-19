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
		const { getByText, queryByText, getByTestId } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: true, canReveal: false },
		});

		expect(
			getByText(
				'This execution used end-user credentials. Data from end-user credential executions cannot be revealed.',
			),
		).toBeInTheDocument();
		expect(queryByText('Execution data has been redacted.')).not.toBeInTheDocument();
		expect(getByTestId('redacted-data-docs-link').closest('a')).toHaveAttribute(
			'href',
			'https://docs.n8n.io/workflows/executions/execution-data-redaction/',
		);
	});

	it('should show no-permission description when isDynamicCredentials is false and canReveal is false', () => {
		const { getByText, queryByText } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: false },
		});

		expect(
			getByText('Execution data has been redacted. You do not have the permissions to reveal it.'),
		).toBeInTheDocument();
		expect(queryByText('workflow settings')).not.toBeInTheDocument();
	});

	it('should show standard description with workflow settings link when isDynamicCredentials is false and canReveal is true', () => {
		const { getByText } = renderComponent({
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: true },
		});

		expect(getByText('Execution data has been redacted.')).toBeInTheDocument();
		expect(getByText('workflow settings')).toBeInTheDocument();
	});

	describe('redaction by a sub-workflow', () => {
		const description =
			'This execution is redacted because a sub-workflow it called has a redaction policy.';

		it('says a sub-workflow caused the redaction and keeps the reveal button', () => {
			const { getByText, queryByText, getByTestId } = renderComponent({
				props: {
					title: 'Redacted',
					isDynamicCredentials: false,
					isSubWorkflowRedaction: true,
					canReveal: true,
				},
			});

			expect(getByText(description)).toBeInTheDocument();
			// The calling workflow's settings do not control this redaction.
			expect(queryByText('workflow settings')).not.toBeInTheDocument();
			expect(getByTestId('ndv-reveal-redacted-data')).toBeInTheDocument();
		});

		it('shows no reveal button without permission', () => {
			const { getByText, queryByTestId } = renderComponent({
				props: {
					title: 'Redacted',
					isDynamicCredentials: false,
					isSubWorkflowRedaction: true,
					canReveal: false,
				},
			});

			expect(getByText(description)).toBeInTheDocument();
			expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
		});
	});

	describe('a credential the viewer can share with themselves', () => {
		const props = {
			title: 'Redacted',
			isDynamicCredentials: false,
			canReveal: false,
			credentialToShare: { id: 'alice-gmail', name: "Alice's Gmail" },
		};

		it('says why the data is hidden and links to the credential sharing', async () => {
			const { getByText, queryByText, getByTestId, emitted } = renderComponent({ props });

			expect(
				getByText("This execution used a credential you don't have access to", { exact: false }),
			).toBeInTheDocument();
			expect(
				queryByText('You do not have the permissions to reveal it', { exact: false }),
			).not.toBeInTheDocument();
			const link = getByTestId('redacted-data-share-credential');
			expect(link).toHaveTextContent("Give yourself access to Alice's Gmail");

			link.click();
			expect(emitted().shareCredential).toHaveLength(1);
		});

		it('shows no link without a credential to share', () => {
			const { queryByTestId } = renderComponent({
				props: { ...props, credentialToShare: undefined },
			});

			expect(queryByTestId('redacted-data-share-credential')).not.toBeInTheDocument();
		});
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
			props: { title: 'Redacted', isDynamicCredentials: false, canReveal: true },
		});

		getByText('workflow settings').click();

		expect(emitted('openSettings')).toHaveLength(1);
	});

	it.each([
		{ isDynamicCredentials: false, canReveal: true },
		{ isDynamicCredentials: false, canReveal: false },
	])(
		'should show docs link regardless of redaction reason (%o)',
		({ isDynamicCredentials, canReveal }) => {
			const { getByTestId } = renderComponent({
				props: { title: 'Redacted', isDynamicCredentials, canReveal },
			});

			expect(getByTestId('redacted-data-docs-link').closest('a')).toHaveAttribute(
				'href',
				'https://docs.n8n.io/workflows/executions/execution-data-redaction/',
			);
		},
	);
});
