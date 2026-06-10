import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import type { ICredentialType } from 'n8n-workflow';

import InlineCredentialSetup from './InlineCredentialSetup.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const renderComponent = createComponentRenderer(InlineCredentialSetup);

const openAiCredType: ICredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAI',
	properties: [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: 'https://api.openai.com/v1',
		},
	],
};

const oauthCredType: ICredentialType = {
	name: 'googleOAuth2Api',
	displayName: 'Google OAuth2',
	extends: ['oAuth2Api'],
	properties: [],
};

function setup(credType: ICredentialType | undefined, credentialTypeName: string) {
	const pinia = createTestingPinia();
	const credentialsStore = mockedStore(useCredentialsStore);

	credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(credType);
	credentialsStore.getNewCredentialName = vi.fn().mockResolvedValue('OpenAI account');
	credentialsStore.createNewCredential = vi
		.fn()
		.mockResolvedValue({ id: 'cred-123', name: 'OpenAI account' });
	credentialsStore.testCredential = vi.fn().mockResolvedValue({ status: 'OK' });

	const result = renderComponent({
		pinia,
		props: { credentialType: credentialTypeName },
	});

	return { ...result, credentialsStore };
}

function getInput(container: Element, field: string): HTMLInputElement {
	const el = container.querySelector(`[data-test-id="inline-credential-field-${field}"]`);
	const input = el?.querySelector('input') ?? el;
	return input as HTMLInputElement;
}

describe('InlineCredentialSetup', () => {
	it('renders editable fields for a simple API-key credential', () => {
		const { container, getByTestId } = setup(openAiCredType, 'openAiApi');

		expect(getByTestId('inline-credential-setup')).toBeInTheDocument();
		expect(getInput(container, 'apiKey')).toBeInTheDocument();
		expect(getInput(container, 'url')).toBeInTheDocument();
	});

	it('masks secret fields (password input)', () => {
		const { container } = setup(openAiCredType, 'openAiApi');
		expect(getInput(container, 'apiKey').type).toBe('password');
	});

	it('creates, tests and emits the credential on connect', async () => {
		const { container, getByTestId, emitted, credentialsStore } = setup(openAiCredType, 'openAiApi');

		await fireEvent.update(getInput(container, 'apiKey'), 'sk-secret-key');
		await fireEvent.click(getByTestId('inline-credential-connect'));

		await waitFor(() => {
			expect(credentialsStore.createNewCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'openAiApi',
					data: expect.objectContaining({ apiKey: 'sk-secret-key' }),
				}),
			);
		});

		expect(credentialsStore.testCredential).toHaveBeenCalled();

		const created = emitted('credentialCreated');
		expect(created).toBeTruthy();
		expect(created[0]).toEqual([
			{ credentialType: 'openAiApi', credentialId: 'cred-123', name: 'OpenAI account' },
		]);

		await waitFor(() => {
			expect(getByTestId('inline-credential-success')).toBeInTheDocument();
		});
	});

	it('keeps the default value for fields the user does not edit', async () => {
		const { container, getByTestId, credentialsStore } = setup(openAiCredType, 'openAiApi');

		await fireEvent.update(getInput(container, 'apiKey'), 'sk-secret-key');
		await fireEvent.click(getByTestId('inline-credential-connect'));

		await waitFor(() => {
			expect(credentialsStore.createNewCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ url: 'https://api.openai.com/v1' }),
				}),
			);
		});
	});

	it('surfaces a failed connection test', async () => {
		const { container, getByTestId, credentialsStore } = setup(openAiCredType, 'openAiApi');
		credentialsStore.testCredential = vi
			.fn()
			.mockResolvedValue({ status: 'Error', message: 'Invalid API key' });

		await fireEvent.update(getInput(container, 'apiKey'), 'bad-key');
		await fireEvent.click(getByTestId('inline-credential-connect'));

		await waitFor(() => {
			expect(getByTestId('inline-credential-error')).toHaveTextContent('Invalid API key');
		});
	});

	it('falls back for OAuth credentials by emitting "unsupported"', () => {
		const { emitted, queryByTestId } = setup(oauthCredType, 'googleOAuth2Api');

		expect(emitted('unsupported')).toBeTruthy();
		expect(queryByTestId('inline-credential-setup')).not.toBeInTheDocument();
	});

	it('emits "useExisting" when the user opts for the standard picker', async () => {
		const { getByTestId, emitted } = setup(openAiCredType, 'openAiApi');

		await fireEvent.click(getByTestId('inline-credential-use-existing'));
		expect(emitted('useExisting')).toBeTruthy();
	});
});
