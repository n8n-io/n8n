import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialInputs from './CredentialInputs.vue';

const renderComponent = createComponentRenderer(CredentialInputs);

describe('compact CredentialInputs', () => {
	beforeEach(() => setActivePinia(createTestingPinia()));

	it('preserves multiline private keys and validates required fields only after submission', async () => {
		const rendered = renderComponent({
			props: {
				compact: true,
				credentialData: { privateKey: '' },
				documentationUrl: '',
				credentialProperties: [
					{
						name: 'privateKey',
						displayName: 'Private key',
						type: 'string',
						required: true,
						default: '',
						typeOptions: { rows: 4, password: true },
					},
				],
			},
		});
		const input = rendered.getByLabelText('Private key');
		expect(input.tagName).toBe('TEXTAREA');
		expect(input).toHaveAttribute('rows', '4');
		expect(rendered.queryByRole('alert')).toBeNull();
		await fireEvent.blur(input);
		expect(rendered.queryByRole('alert')).toBeNull();
		await rendered.rerender({ showValidationWarnings: true });
		expect(rendered.getByRole('alert')).toHaveTextContent('This field is required');
		const key = '-----BEGIN PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----';
		await fireEvent.update(input, key);
		expect(rendered.emitted('update')).toContainEqual([{ name: 'privateKey', value: key }]);
		await rendered.rerender({ credentialData: { privateKey: key } });
		expect(rendered.queryByRole('alert')).toBeNull();
		expect(input).toHaveValue(key);
	});

	it('keeps compact OAuth labels visible and focuses their inputs on click', async () => {
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
						placeholder: 'app-client-id',
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
		const clientLabel = rendered.getByText('Client ID');
		const secretLabel = rendered.getByText('Client Secret');
		expect(clientLabel.closest('label')).toHaveAttribute('for', client.id);
		expect(clientLabel).toBeVisible();
		expect(secretLabel).toBeVisible();
		expect(client).toHaveAttribute('placeholder', 'app-client-id');
		expect(rendered.getByLabelText('Client Secret')).toHaveAttribute('type', 'password');
		await userEvent.click(clientLabel);
		expect(client).toHaveFocus();
		await fireEvent.update(client, 'app-client');
		expect(rendered.emitted('update')).toContainEqual([{ name: 'clientId', value: 'app-client' }]);
		await rendered.rerender({
			credentialData: { clientId: 'app-client', clientSecret: 'demo-secret' },
		});
		expect(clientLabel).toBeVisible();
		expect(secretLabel).toBeVisible();
	});
});
