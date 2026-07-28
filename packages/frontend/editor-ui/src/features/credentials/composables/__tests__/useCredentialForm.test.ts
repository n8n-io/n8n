import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType } from 'n8n-workflow';

import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useCredentialsStore } from '../../credentials.store';
import type { ICredentialsDecryptedResponse } from '../../credentials.types';
import { useCredentialForm } from '../useCredentialForm';
import { probeCredential } from '../../credentials.api';

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));
vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({ displayParameter: () => true }),
}));
vi.mock('@/features/credentials/credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	probeCredential: vi.fn(),
}));

const httpBasicAuth: ICredentialType = {
	name: 'httpBasicAuth',
	displayName: 'HTTP Basic Auth',
	properties: [
		{ displayName: 'User', name: 'user', type: 'string', default: '' },
		{ displayName: 'Password', name: 'password', type: 'string', default: '' },
	],
};

// A type whose managed clientId/secret are provided by the instance (Cloud).
const managedOAuth: ICredentialType = {
	name: 'acmeOAuth2Api',
	displayName: 'Acme OAuth2 API',
	__overwrittenProperties: ['clientId', 'clientSecret'],
	properties: [
		{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '' },
		{ displayName: 'Client Secret', name: 'clientSecret', type: 'string', default: '' },
	],
};

// A private-credential type with both shared (static) and per-user (resolvable) fields.
const privateOAuth: ICredentialType = {
	name: 'privateOAuth2Api',
	displayName: 'Private OAuth2 API',
	properties: [
		{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '' },
		{ displayName: 'Client Secret', name: 'clientSecret', type: 'string', default: '' },
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			resolvableField: true,
		},
	],
};

// A managed OAuth type opted out of managed creation (skip-list) — the overwrite
// exists but the managed option must not be offered.
const skipManagedOAuth: ICredentialType = {
	name: 'skipOAuth2Api',
	displayName: 'Skip OAuth2 API',
	__overwrittenProperties: ['clientId', 'clientSecret'],
	__skipManagedCreation: true,
	properties: [
		{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '' },
		{ displayName: 'Client Secret', name: 'clientSecret', type: 'string', default: '' },
	],
};

// The recipe-driven generic type: the modal seeds its template fields from an
// agent-supplied setup hint.
const templatedCustomAuth: ICredentialType = {
	name: 'httpTemplatedCustomAuth',
	displayName: 'Simplified Custom Auth',
	properties: [
		{ displayName: 'Template', name: 'template', type: 'json', required: true, default: '' },
		{ displayName: 'Placeholders', name: 'placeholderDefs', type: 'json', default: '' },
		{ displayName: 'Placeholder Values', name: 'placeholderValues', type: 'json', default: '' },
		{ displayName: 'Test URL', name: 'testUrl', type: 'string', default: '' },
		{ displayName: 'Documentation URL', name: 'docsUrl', type: 'string', default: '' },
	],
};

const typesByName: Record<string, ICredentialType> = {
	httpBasicAuth,
	acmeOAuth2Api: managedOAuth,
	privateOAuth2Api: privateOAuth,
	skipOAuth2Api: skipManagedOAuth,
	httpTemplatedCustomAuth: templatedCustomAuth,
};

const falSetupHint = {
	template: { headers: { Authorization: 'Key {{api_key}}' } },
	placeholders: [{ name: 'api_key', title: 'fal.ai API key' }],
	suggestedName: 'fal.ai API Key',
	testUrl: 'https://fal.run/v1/models',
	docsUrl: 'https://fal.ai/dashboard/keys',
};

describe('useCredentialForm', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		credentialsStore = mockedStore(useCredentialsStore);
		settingsStore = mockedStore(useSettingsStore);
		// getCredentialTypeByName is a getter returning a function — override the
		// getter directly (vi.spyOn can't type a getter whose value is a function).
		Object.defineProperty(credentialsStore, 'getCredentialTypeByName', {
			configurable: true,
			get: () => (name: string) => typesByName[name],
		});
		credentialsStore.getNewCredentialName.mockResolvedValue('HTTP Basic Auth account');
		credentialsStore.getDedupedCredentialName.mockImplementation(async (name: string) => name);
	});

	describe('displayCredentialParameter', () => {
		const cloudParameter = {
			displayName: 'Cloud setting',
			name: 'cloudSetting',
			type: 'string' as const,
			default: '',
			displayOptions: { showOnDeployment: 'cloud' as const },
		};

		it('hides Cloud-only parameters on hosted deployments', () => {
			settingsStore.isCloudDeployment = false;
			const form = useCredentialForm({ mode: 'new', activeId: 'httpBasicAuth' });

			expect(form.displayCredentialParameter(cloudParameter)).toBe(false);
		});

		it('shows Cloud-only parameters on Cloud deployments', () => {
			settingsStore.isCloudDeployment = true;
			const form = useCredentialForm({ mode: 'new', activeId: 'httpBasicAuth' });

			expect(form.displayCredentialParameter(cloudParameter)).toBe(true);
		});
	});

	describe('initialize', () => {
		it('seeds a generated name and property defaults for a new credential', async () => {
			const form = useCredentialForm({ mode: 'new', activeId: 'httpBasicAuth' });

			await form.initialize();

			expect(form.credentialName.value).toBe('HTTP Basic Auth account');
			expect(form.credentialData.value).toMatchObject({ user: '', password: '' });
		});

		it('prefers the suggested name over a generated one, deduped against clashes', async () => {
			credentialsStore.getDedupedCredentialName.mockResolvedValue('My login 2');
			const form = useCredentialForm({
				mode: 'new',
				activeId: 'httpBasicAuth',
				suggestedName: 'My login',
			});

			await form.initialize();

			expect(credentialsStore.getDedupedCredentialName).toHaveBeenCalledWith('My login');
			expect(form.credentialName.value).toBe('My login 2');
			expect(credentialsStore.getNewCredentialName).not.toHaveBeenCalled();
		});

		it('loads the existing credential in edit mode', async () => {
			credentialsStore.getCredentialData.mockResolvedValue({
				id: 'cred-1',
				name: 'Loaded Cred',
				type: 'httpBasicAuth',
				data: { user: 'alice' },
			} as unknown as ICredentialsDecryptedResponse);
			const form = useCredentialForm({ mode: 'edit', activeId: 'cred-1' });

			await form.initialize();

			expect(form.credentialId.value).toBe('cred-1');
			expect(form.credentialName.value).toBe('Loaded Cred');
			expect(form.credentialData.value.user).toBe('alice');
		});

		it('seeds template fields and a creator-suffixed name from a setup hint', async () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { firstName: 'Jan', lastName: 'Doe' } as IUser;
			const form = useCredentialForm({
				mode: 'new',
				activeId: 'httpTemplatedCustomAuth',
				setupHint: falSetupHint,
			});

			await form.initialize();

			expect(form.credentialName.value).toBe('fal.ai API Key (Jan D)');
			expect(form.credentialData.value).toMatchObject({
				template: JSON.stringify(falSetupHint.template, null, 2),
				placeholderDefs: JSON.stringify(falSetupHint.placeholders, null, 2),
				testUrl: falSetupHint.testUrl,
				docsUrl: falSetupHint.docsUrl,
			});
			// A filled template + persisted test URL makes the credential probeable.
			expect(form.isCredentialTestable.value).toBe(true);
		});

		it('flags custom OAuth when editing a credential with overridden client fields', async () => {
			credentialsStore.getCredentialData.mockResolvedValue({
				id: 'cred-2',
				name: 'Custom OAuth',
				type: 'acmeOAuth2Api',
				data: { clientId: 'my-id', clientSecret: 'my-secret' },
			} as unknown as ICredentialsDecryptedResponse);
			const form = useCredentialForm({ mode: 'edit', activeId: 'cred-2' });

			await form.initialize();

			expect(form.useCustomOAuth.value).toBe(true);
		});
	});

	describe('testCredential', () => {
		it('routes a saved Templated Custom Auth credential through the auth probe', async () => {
			vi.mocked(probeCredential).mockResolvedValue({ status: 'Error', message: 'Received 401' });
			const form = useCredentialForm({
				mode: 'new',
				activeId: 'httpTemplatedCustomAuth',
				setupHint: falSetupHint,
			});
			await form.initialize();

			await form.testCredential({
				id: 'cred-9',
				name: 'fal.ai API Key',
				type: 'httpTemplatedCustomAuth',
				data: form.credentialData.value as never,
			});

			expect(probeCredential).toHaveBeenCalledWith(expect.anything(), 'cred-9');
			expect(credentialsStore.testCredential).not.toHaveBeenCalled();
			expect(form.authError.value).toBe('Received 401');
		});
	});

	describe('getChangedSharedFields', () => {
		async function loadPrivateCred() {
			credentialsStore.getCredentialData.mockResolvedValue({
				id: 'cred-3',
				name: 'Private Cred',
				type: 'privateOAuth2Api',
				data: { clientId: 'id', clientSecret: 'secret', accessToken: 'token' },
			} as unknown as ICredentialsDecryptedResponse);
			const form = useCredentialForm({ mode: 'edit', activeId: 'cred-3' });
			await form.initialize();
			return form;
		}

		it('detects a changed shared (static) field', async () => {
			const form = await loadPrivateCred();

			expect(form.getChangedSharedFields({ clientId: 'new-id', clientSecret: 'secret' })).toEqual([
				'clientId',
			]);
		});

		it('ignores changes to resolvable (per-user) fields', async () => {
			const form = await loadPrivateCred();

			expect(form.getChangedSharedFields({ clientId: 'id', accessToken: 'new-token' })).toEqual([]);
		});

		it('returns empty when shared fields are unchanged', async () => {
			const form = await loadPrivateCred();

			expect(form.getChangedSharedFields({ clientId: 'id', clientSecret: 'secret' })).toEqual([]);
		});
	});

	describe('managedOAuthAvailable', () => {
		// Regression (IAM-853): opening a new credential from the Credentials tab has
		// no node context, so managed availability must derive from the selected type
		// directly (via its overwritten client fields), not only from the active node.
		it('is true for an overwritten OAuth type with no node context', () => {
			const form = useCredentialForm({ mode: 'new', activeId: 'acmeOAuth2Api' });

			expect(form.managedOAuthAvailable.value).toBe(true);
		});

		it('is false for a type without overwritten client fields', () => {
			const form = useCredentialForm({ mode: 'new', activeId: 'httpBasicAuth' });

			expect(form.managedOAuthAvailable.value).toBe(false);
		});

		it('is false for a skip-list type even though it is overwritten', () => {
			const form = useCredentialForm({ mode: 'new', activeId: 'skipOAuth2Api' });

			expect(form.managedOAuthAvailable.value).toBe(false);
		});
	});
});
