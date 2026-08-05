import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INode, INodeTypeDescription } from 'n8n-workflow';

import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCredentialsStore } from '../../credentials.store';
import type { ICredentialsDecryptedResponse } from '../../credentials.types';
import { useCredentialForm } from '../useCredentialForm';
import { probeCredential } from '../../credentials.api';

vi.mock('@n8n/composables/useToast', () => ({
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

// The templated generic type: no static test definition — a persisted test
// URL routes the modal's connection test through the auth probe instead.
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

// Plain per-auth-option types for a node with an auth selector.
const alphaApi: ICredentialType = {
	name: 'alphaApi',
	displayName: 'Alpha API',
	properties: [],
};

const betaApi: ICredentialType = {
	name: 'betaApi',
	displayName: 'Beta API',
	properties: [],
};

const typesByName: Record<string, ICredentialType> = {
	httpBasicAuth,
	acmeOAuth2Api: managedOAuth,
	privateOAuth2Api: privateOAuth,
	skipOAuth2Api: skipManagedOAuth,
	httpTemplatedCustomAuth: templatedCustomAuth,
	alphaApi,
	betaApi,
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

	describe('testCredential', () => {
		it('routes a saved Templated Custom Auth credential through the auth probe', async () => {
			vi.mocked(probeCredential).mockResolvedValue({ status: 'Error', message: 'Received 401' });
			const form = useCredentialForm({ mode: 'new', activeId: 'httpTemplatedCustomAuth' });
			await form.initialize();
			form.credentialData.value = {
				...form.credentialData.value,
				template: JSON.stringify({ headers: { Authorization: 'Key {{api_key}}' } }),
				placeholderValues: JSON.stringify({ api_key: 'abc' }),
				testUrl: 'https://fal.run/v1/models',
			};

			// A filled template + persisted http(s) test URL makes the credential probeable.
			expect(form.isCredentialTestable.value).toBe(true);

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

		it('surfaces a thrown probe as a test failure instead of wedging the flags', async () => {
			vi.mocked(probeCredential).mockRejectedValue(
				new Error('Request failed with status code 400'),
			);
			const form = useCredentialForm({ mode: 'new', activeId: 'httpTemplatedCustomAuth' });
			await form.initialize();
			form.credentialData.value = {
				...form.credentialData.value,
				template: JSON.stringify({ headers: { Authorization: 'Key {{api_key}}' } }),
				placeholderValues: JSON.stringify({ api_key: 'abc' }),
				testUrl: 'https://fal.run/v1/models',
			};

			await form.testCredential({
				id: 'cred-9',
				name: 'fal.ai API Key',
				type: 'httpTemplatedCustomAuth',
				data: form.credentialData.value as never,
			});

			expect(form.authError.value).toBe('Request failed with status code 400');
			expect(form.testedSuccessfully.value).toBe(false);
		});
	});

	describe('requiredPropertiesFilled', () => {
		it('blocks save and test while a required placeholder has no value', async () => {
			const form = useCredentialForm({ mode: 'new', activeId: 'httpTemplatedCustomAuth' });
			await form.initialize();
			form.credentialData.value = {
				...form.credentialData.value,
				template: JSON.stringify({ headers: { Authorization: 'Key {{api_key}}' } }),
				placeholderValues: JSON.stringify({}),
				testUrl: 'https://fal.run/v1/models',
			};

			expect(form.requiredPropertiesFilled.value).toBe(false);
			expect(form.isCredentialTestable.value).toBe(false);

			// an optional marker without a value doesn't block
			form.credentialData.value = {
				...form.credentialData.value,
				placeholderDefs: JSON.stringify([{ name: 'api_key', title: 'Key', optional: true }]),
			};
			expect(form.requiredPropertiesFilled.value).toBe(true);

			// the untouched redacted sentinel counts as filled
			form.credentialData.value = {
				...form.credentialData.value,
				placeholderDefs: '',
				placeholderValues: JSON.stringify({ api_key: '***' }),
			};
			expect(form.requiredPropertiesFilled.value).toBe(true);
		});

		it('blocks save while the template parses but has the wrong shape', async () => {
			// the server resolver only accepts an object with object-valued
			// headers/body/qs parts; anything else saves fine syntactically but
			// can never resolve
			const form = useCredentialForm({ mode: 'new', activeId: 'httpTemplatedCustomAuth' });
			await form.initialize();

			form.credentialData.value = {
				...form.credentialData.value,
				template: JSON.stringify([1, 2, 3]),
			};
			expect(form.requiredPropertiesFilled.value).toBe(false);

			form.credentialData.value = {
				...form.credentialData.value,
				template: JSON.stringify({ headers: 'Bearer x' }),
			};
			expect(form.requiredPropertiesFilled.value).toBe(false);

			form.credentialData.value = {
				...form.credentialData.value,
				template: JSON.stringify({ headers: { Authorization: 'Key {{api_key}}' } }),
				placeholderValues: JSON.stringify({ api_key: 'abc' }),
			};
			expect(form.requiredPropertiesFilled.value).toBe(true);
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

	describe('selectedCredentialType (auth selector)', () => {
		const twoAuthNodeType = {
			displayName: 'Two Auth Service',
			name: 'n8n-nodes-base.twoAuth',
			group: ['input'],
			version: 1,
			description: 'Service with two auth options',
			defaults: { name: 'Two Auth Service' },
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'alphaApi',
					required: true,
					displayOptions: { show: { authentication: ['alpha'] } },
				},
				{
					name: 'betaApi',
					required: true,
					displayOptions: { show: { authentication: ['beta'] } },
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{ name: 'Alpha', value: 'alpha' },
						{ name: 'Beta', value: 'beta' },
					],
					default: 'alpha',
				},
			],
		} as unknown as INodeTypeDescription;

		const contextNode = {
			id: 'node-1',
			name: 'Two Auth Node',
			type: 'n8n-nodes-base.twoAuth',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode;

		beforeEach(() => {
			mockedStore(useNodeTypesStore).getNodeType = () => twoAuthNodeType;
		});

		it('defaults to the activeId credential type when the node has multiple auth options', () => {
			const form = useCredentialForm({
				mode: 'new',
				activeId: 'betaApi',
				contextNode,
				showAuthSelector: true,
			});

			expect(form.credentialTypeName.value).toBe('betaApi');
		});

		it('falls back to the first auth option when activeId is not among the node credentials', () => {
			const form = useCredentialForm({
				mode: 'new',
				activeId: 'gammaApi',
				contextNode,
				showAuthSelector: true,
			});

			expect(form.credentialTypeName.value).toBe('alphaApi');
		});

		it('falls back to the first auth option when no activeId is given', () => {
			const form = useCredentialForm({
				mode: 'new',
				contextNode,
				showAuthSelector: true,
			});

			expect(form.credentialTypeName.value).toBe('alphaApi');
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
