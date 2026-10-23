import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import SecretsProvidersEmptyState from './SecretsProvidersEmptyState.ee.vue';

const PROVIDER_TYPES: SecretProviderTypeResponse[] = [
	{ type: 'awsSecretsManager', displayName: 'AWS Secrets Manager', icon: 'aws', properties: [] },
	{ type: 'vault', displayName: 'HashiCorp Vault', icon: 'vault', properties: [] },
	{ type: 'infisical', displayName: 'Infisical', icon: 'infisical', properties: [] },
	{ type: 'onePassword', displayName: '1Password', icon: 'one-password', properties: [] },
];

const renderComponent = createComponentRenderer(SecretsProvidersEmptyState, {
	props: { providerTypes: PROVIDER_TYPES, canCreate: true },
});

describe('SecretsProvidersEmptyState', () => {
	it('should render the design-system empty state with the vault icon cards', () => {
		const { getByTestId, getByAltText, container } = renderComponent();

		const emptyState = getByTestId('secrets-provider-connections-empty-state');
		expect(emptyState).toHaveClass('n8n-empty-state');
		expect(emptyState).toHaveTextContent('Add an external secrets vault');
		// The centre card carries the vault mark; the side cards start on the first provider
		// (an inline SVG mark) and the one halfway around the list (a raster logo).
		expect(container.querySelector('[data-icon="vault"]')).toBeInTheDocument();
		expect(container.querySelector('svg:not([data-icon])')).toBeInTheDocument();
		expect(getByAltText('Infisical')).toBeInTheDocument();
	});

	it('should keep a single button next to the learn-more link, and emit on click', async () => {
		const { getByTestId, getAllByRole, getByRole, emitted } = renderComponent();

		expect(getByTestId('secrets-provider-connections-learn-more').tagName).toBe('A');
		// The e2e page object clicks the only button inside the empty state.
		expect(getAllByRole('button')).toHaveLength(1);

		await userEvent.click(getByRole('button', { name: 'Add secrets vault' }));

		expect(emitted('addSecretsStore')).toHaveLength(1);
	});

	it('should hide the add button when the user cannot create connections', () => {
		const { queryByRole } = renderComponent({ props: { canCreate: false } });

		expect(queryByRole('button')).not.toBeInTheDocument();
	});
});
