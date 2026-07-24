import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType } from 'n8n-workflow';

import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCredentialsStore } from '../../credentials.store';
import type { ICredentialsDecryptedResponse } from '../../credentials.types';
import { useCredentialForm } from '../useCredentialForm';

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));
vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({ displayParameter: () => true }),
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

const typesByName: Record<string, ICredentialType> = {
	httpBasicAuth,
	acmeOAuth2Api: managedOAuth,
	privateOAuth2Api: privateOAuth,
	skipOAuth2Api: skipManagedOAuth,
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

		it('prefers the suggested name over a generated one', async () => {
			const form = useCredentialForm({
				mode: 'new',
				activeId: 'httpBasicAuth',
				suggestedName: 'My login',
			});

			await form.initialize();

			expect(form.credentialName.value).toBe('My login');
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
