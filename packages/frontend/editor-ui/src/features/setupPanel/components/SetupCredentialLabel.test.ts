import { createComponentRenderer } from '@/__tests__/render';
import SetupCredentialLabel from './SetupCredentialLabel.vue';

const renderComponent = createComponentRenderer(SetupCredentialLabel);

describe('SetupCredentialLabel', () => {
	const defaultProps = {
		nodeName: 'OpenAI',
		credentialType: 'openAiApi',
		nodesWithSameCredential: ['OpenAI'],
	};

	it('should render credential label', () => {
		const { getByTestId } = renderComponent({ props: defaultProps });

		expect(getByTestId('node-setup-card-credential-label')).toBeInTheDocument();
	});

	it('should set correct "for" attribute on label', () => {
		const { getByTestId } = renderComponent({ props: defaultProps });

		expect(getByTestId('node-setup-card-credential-label')).toHaveAttribute(
			'for',
			'credential-picker-OpenAI-openAiApi',
		);
	});

	it('should not show shared nodes hint when credential is used by a single node', () => {
		const { queryByTestId } = renderComponent({ props: defaultProps });

		expect(queryByTestId('node-setup-card-shared-nodes-hint')).not.toBeInTheDocument();
	});

	it('should show shared nodes hint when credential is used by multiple nodes', () => {
		const { getByTestId } = renderComponent({
			props: {
				...defaultProps,
				nodesWithSameCredential: ['OpenAI', 'GPT Node'],
			},
		});

		expect(getByTestId('node-setup-card-shared-nodes-hint')).toBeInTheDocument();
	});
});
