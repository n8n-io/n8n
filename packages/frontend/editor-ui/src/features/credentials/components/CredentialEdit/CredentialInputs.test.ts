import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialInputs from './CredentialInputs.vue';

const renderComponent = createComponentRenderer(CredentialInputs);

describe('compact CredentialInputs', () => {
	beforeEach(() => setActivePinia(createTestingPinia()));

	it('renders accessible compact OAuth fields and emits edits with their property names', async () => {
		const rendered = renderComponent({
			props: {
				compact: true,
				credentialType: 'oAuth2Api',
				documentationUrl: '',
				credentialData: { clientId: '', clientSecret: '' },
				credentialProperties: [
					{
						name: 'clientId',
						displayName: 'Client ID',
						type: 'string',
						default: '',
						required: true,
					},
					{
						name: 'clientSecret',
						displayName: 'Client Secret',
						type: 'string',
						default: '',
						required: true,
						typeOptions: { password: true },
					},
				],
			},
		});
		const client = rendered.getByRole('textbox', { name: 'Client ID' });
		expect(client).toHaveAttribute('placeholder', 'Client ID');
		expect(rendered.getByLabelText('Client Secret')).toHaveAttribute('type', 'password');
		await fireEvent.update(client, 'app-client');
		expect(rendered.emitted('update')).toContainEqual([{ name: 'clientId', value: 'app-client' }]);
	});
});
