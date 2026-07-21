import CredentialConfig from './CredentialConfig.vue';
import { screen } from '@testing-library/vue';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { STORES } from '@n8n/stores';
import { vi } from 'vitest';
import { useCredentialsStore } from '../../credentials.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import { addCredentialTranslation } from '@n8n/i18n';
import type { INodeUi } from '@/Interface';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

vi.mock('@n8n/i18n', async () => {
	const actual = await vi.importActual('@n8n/i18n');
	return {
		...actual,
		addCredentialTranslation: vi.fn(),
	};
});

const mockCredentialType: ICredentialType = {
	name: 'testCredential',
	displayName: 'Test Credential',
	properties: [],
};

const defaultRenderOptions: RenderOptions<typeof CredentialConfig> = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: false,
						externalSecrets: false,
					},
				},
			},
		},
	}),
	props: {
		isManaged: true,
		mode: 'edit',
		credentialType: mockCredentialType,
		credentialProperties: [],
		credentialData: {} as ICredentialDataDecryptedObject,
		credentialPermissions: {
			share: false,
			move: false,
			create: false,
			read: false,
			update: false,
			delete: false,
			list: false,
		},
	},
};

const renderComponent = createComponentRenderer(CredentialConfig, defaultRenderOptions);

describe('CredentialConfig', () => {
	it('should display a warning when isManaged is true', async () => {
		renderComponent();
		expect(
			screen.queryByText('This is a managed credential and cannot be edited.'),
		).toBeInTheDocument();
	});

	it('should not display a warning when isManaged is false', async () => {
		renderComponent({ props: { isManaged: false } }, { merge: true });
		expect(
			screen.queryByText('This is a managed credential and cannot be edited.'),
		).not.toBeInTheDocument();
	});

	it('should not call addCredentialTranslation when getCredentialTranslation returns null', async () => {
		const testCredentialType = {
			name: 'testCredential',
			displayName: 'Test Credential',
		} as ICredentialType;

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							sharing: false,
							externalSecrets: false,
						},
					},
				},
				[STORES.ROOT]: {
					defaultLocale: 'de', // Non-English locale to trigger translation loading
				},
			},
			stubActions: false,
		});

		// Mock the getCredentialTranslation method to return null
		const credentialsStore = useCredentialsStore();
		credentialsStore.getCredentialTranslation = vi.fn().mockResolvedValue(null);

		// Clear any previous calls to addCredentialTranslation
		vi.mocked(addCredentialTranslation).mockClear();

		renderComponent(
			{
				props: {
					credentialType: testCredentialType,
				},
				pinia,
			},
			{ merge: true },
		);

		// Wait for the component to mount and onBeforeMount to complete
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Verify that addCredentialTranslation was not called
		expect(addCredentialTranslation).not.toHaveBeenCalled();
	});

	it('should not call addCredentialTranslation when getCredentialTranslation returns undefined', async () => {
		const testCredentialType2 = {
			name: 'testCredential',
			displayName: 'Test Credential',
		} as ICredentialType;

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							sharing: false,
							externalSecrets: false,
						},
					},
				},
				[STORES.ROOT]: {
					defaultLocale: 'de', // Non-English locale to trigger translation loading
				},
			},
			stubActions: false,
		});

		// Mock the getCredentialTranslation method to return undefined
		const credentialsStore = useCredentialsStore();
		credentialsStore.getCredentialTranslation = vi.fn().mockResolvedValue(undefined);

		// Clear any previous calls to addCredentialTranslation
		vi.mocked(addCredentialTranslation).mockClear();

		renderComponent(
			{
				props: {
					credentialType: testCredentialType2,
				},
				pinia,
			},
			{ merge: true },
		);

		// Wait for the component to mount and onBeforeMount to complete
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Verify that addCredentialTranslation was not called
		expect(addCredentialTranslation).not.toHaveBeenCalled();
	});

	describe('Dynamic Credentials Section', () => {
		it('should not display dynamic credentials section when isPrivateCredentialsEnabled is false', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: false,
					isOAuthType: true,
					isNewCredential: true,
					credentialPermissions: {
						create: true,
						update: true,
						read: true,
						delete: true,
						share: true,
						list: true,
						move: true,
					},
				},
			});

			expect(screen.queryByTestId('credential-type-selector')).not.toBeInTheDocument();
		});

		it('should not display dynamic credentials section when isOAuthType is false', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: false,
					isNewCredential: true,
					credentialPermissions: {
						create: true,
						update: true,
						read: true,
						delete: true,
						share: true,
						list: true,
						move: true,
					},
				},
			});

			expect(screen.queryByTestId('credential-type-selector')).not.toBeInTheDocument();
		});

		it('should not display dynamic credentials section when user lacks create permission for new credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: true,
					credentialPermissions: {
						create: false,
						update: false,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.queryByTestId('credential-type-selector')).not.toBeInTheDocument();
		});

		it('should not display dynamic credentials section when user lacks update permission for existing credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					credentialPermissions: {
						create: false,
						update: false,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.queryByTestId('credential-type-selector')).not.toBeInTheDocument();
		});

		it('should display dynamic credentials section when all conditions are met for new credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: true,
					isResolvable: false,
					credentialPermissions: {
						create: true,
						createEndUser: true,
						update: false,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.getByTestId('credential-type-selector')).toBeInTheDocument();
			expect(screen.getByTestId('credential-type-card-end-user')).toBeInTheDocument();
		});

		it('should display dynamic credentials section when all conditions are met for existing credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					isResolvable: false,
					credentialPermissions: {
						create: false,
						createEndUser: true,
						update: true,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.getByTestId('credential-type-selector')).toBeInTheDocument();
			expect(screen.getByTestId('credential-type-card-end-user')).toBeInTheDocument();
		});

		it('should keep the end-user credential card enabled when the credential is already shared', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					isResolvable: false,
					credentialPermissions: {
						create: false,
						createEndUser: true,
						update: true,
						read: true,
						delete: false,
						share: true,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.getByTestId('credential-type-card-end-user')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('should hide the type selector when the user cannot create end-user credentials', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					isResolvable: false,
					credentialPermissions: {
						create: false,
						createEndUser: false,
						update: true,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.queryByTestId('credential-type-selector')).not.toBeInTheDocument();
		});

		it('should hide the type selector for an end-user credential without the createEndUser permission', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					isResolvable: true,
					credentialPermissions: {
						create: false,
						createEndUser: false,
						update: true,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.queryByTestId('credential-type-selector')).not.toBeInTheDocument();
		});

		it('should show the type selector for an end-user credential with the createEndUser permission', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isPrivateCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					isResolvable: true,
					credentialPermissions: {
						create: false,
						createEndUser: true,
						update: true,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.getByTestId('credential-type-selector')).toBeInTheDocument();
		});
	});

	describe('Disconnect button on success banner', () => {
		const writePermissions = {
			create: true,
			update: true,
			read: true,
			delete: false,
			share: false,
			list: true,
			move: false,
			connect: true,
		};

		const oAuthConnectedProps = {
			isManaged: false,
			mode: 'edit' as const,
			credentialType: mockCredentialType,
			credentialProperties: [],
			credentialData: {} as ICredentialDataDecryptedObject,
			isOAuthType: true,
			isOAuthConnected: true,
			requiredPropertiesFilled: true,
			credentialPermissions: writePermissions,
		};

		it('renders Disconnect when resolvable, connectedByMe and dynamic credentials enabled', () => {
			renderComponent({
				props: {
					...oAuthConnectedProps,
					isPrivateCredentialsEnabled: true,
					isResolvable: true,
					connectedByMe: true,
				},
			});

			expect(screen.getByTestId('oauth-disconnect-button')).toBeInTheDocument();
		});

		it('hides Disconnect when connectedByMe is false', () => {
			renderComponent({
				props: {
					...oAuthConnectedProps,
					isPrivateCredentialsEnabled: true,
					isResolvable: true,
					connectedByMe: false,
				},
			});

			expect(screen.queryByTestId('oauth-disconnect-button')).not.toBeInTheDocument();
		});

		it('hides Disconnect for static (non-resolvable) credentials', () => {
			renderComponent({
				props: {
					...oAuthConnectedProps,
					isPrivateCredentialsEnabled: true,
					isResolvable: false,
					connectedByMe: true,
				},
			});

			expect(screen.queryByTestId('oauth-disconnect-button')).not.toBeInTheDocument();
		});

		it('hides Disconnect when dynamic credentials are disabled', () => {
			renderComponent({
				props: {
					...oAuthConnectedProps,
					isPrivateCredentialsEnabled: false,
					isResolvable: true,
					connectedByMe: true,
				},
			});

			expect(screen.queryByTestId('oauth-disconnect-button')).not.toBeInTheDocument();
		});

		it('emits disconnect on click', async () => {
			const { emitted } = renderComponent({
				props: {
					...oAuthConnectedProps,
					isPrivateCredentialsEnabled: true,
					isResolvable: true,
					connectedByMe: true,
				},
			});

			await screen.getByTestId('oauth-disconnect-button').click();
			expect(emitted().disconnect).toBeTruthy();
		});
	});

	describe('Connect banner gating for private credentials', () => {
		const notConnectedProps = {
			isManaged: false,
			mode: 'edit' as const,
			credentialType: mockCredentialType,
			credentialProperties: [],
			credentialData: {} as ICredentialDataDecryptedObject,
			isOAuthType: true,
			isOAuthConnected: false,
			requiredPropertiesFilled: true,
			isPrivateCredentialsEnabled: true,
			isResolvable: true,
		};

		it('shows the connect button when the user has the connect scope but cannot edit', () => {
			renderComponent({
				props: {
					...notConnectedProps,
					credentialPermissions: { read: true, connect: true },
				},
			});

			expect(screen.getByTestId('quick-connect-button')).toBeInTheDocument();
		});

		it('hides the connect button when the user lacks the connect scope', () => {
			renderComponent({
				props: {
					...notConnectedProps,
					credentialPermissions: { read: true },
				},
			});

			expect(screen.queryByTestId('quick-connect-button')).not.toBeInTheDocument();
		});
	});

	describe('OAuth Redirect URL', () => {
		const writePermissions = {
			create: true,
			update: true,
			read: true,
			delete: true,
			share: true,
			list: true,
			move: true,
		};

		it('should show redirect URL for OAuth credentials without managed OAuth', () => {
			renderComponent({
				pinia: createTestingPinia({
					initialState: {
						[STORES.SETTINGS]: {
							settings: { enterprise: { sharing: false, externalSecrets: false } },
						},
						[STORES.ROOT]: {
							oauthCallbackUrls: { oauth2: 'https://example.com/callback' },
						},
					},
				}),
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isOAuthType: true,
					managedOauthAvailable: false,
					useCustomOauth: false,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.getByTestId('copy-input')).toBeInTheDocument();
		});

		it('should show redirect URL when managed OAuth is available but user chose custom', () => {
			renderComponent({
				pinia: createTestingPinia({
					initialState: {
						[STORES.SETTINGS]: {
							settings: { enterprise: { sharing: false, externalSecrets: false } },
						},
						[STORES.ROOT]: {
							oauthCallbackUrls: { oauth2: 'https://example.com/callback' },
						},
					},
				}),
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isOAuthType: true,
					managedOauthAvailable: true,
					useCustomOauth: true,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.getByTestId('copy-input')).toBeInTheDocument();
		});

		it('should not show redirect URL when using managed OAuth', () => {
			renderComponent({
				pinia: createTestingPinia({
					initialState: {
						[STORES.SETTINGS]: {
							settings: { enterprise: { sharing: false, externalSecrets: false } },
						},
						[STORES.ROOT]: {
							oauthCallbackUrls: { oauth2: 'https://example.com/callback' },
						},
					},
				}),
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isOAuthType: true,
					managedOauthAvailable: true,
					useCustomOauth: false,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.queryByTestId('copy-input')).not.toBeInTheDocument();
		});

		it('should not show redirect URL for non-OAuth credentials', () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isOAuthType: false,
					managedOauthAvailable: false,
					useCustomOauth: false,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.queryByTestId('copy-input')).not.toBeInTheDocument();
		});
	});

	describe('Mode Selector visibility', () => {
		const dropboxApiType: ICredentialType = {
			name: 'dropboxApi',
			displayName: 'Dropbox API',
			properties: [
				{ displayName: 'Access Token', name: 'accessToken', type: 'string', default: '' },
			],
		};

		const dropboxOAuth2ApiType: ICredentialType = {
			name: 'dropboxOAuth2Api',
			extends: ['oAuth2Api'],
			displayName: 'Dropbox OAuth2 API',
			properties: [],
		};

		const twoAuthNodeType = {
			displayName: 'Dropbox',
			name: 'n8n-nodes-base.dropbox',
			group: ['input'],
			version: 1,
			description: 'Access data on Dropbox',
			defaults: { name: 'Dropbox' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'dropboxApi',
					required: true,
					displayOptions: { show: { authentication: ['accessToken'] } },
				},
				{
					name: 'dropboxOAuth2Api',
					required: true,
					displayOptions: { show: { authentication: ['oAuth2'] } },
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{ name: 'Access Token', value: 'accessToken' },
						{ name: 'OAuth2', value: 'oAuth2' },
					],
					default: 'accessToken',
				},
			],
		} as unknown as INodeTypeDescription;

		const writePermissions = {
			create: true,
			update: true,
			read: true,
			delete: true,
			share: true,
			list: true,
			move: true,
		};

		function setupMultiAuthStores() {
			const pinia = createTestingPinia({
				stubActions: false,
				initialState: {
					[STORES.SETTINGS]: {
						settings: { enterprise: { sharing: false, externalSecrets: false } },
					},
				},
			});

			const workflowsStore = useWorkflowsStore();
			workflowsStore.setWorkflowId('test-workflow-id');
			const ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId('test-workflow-id'));
			ndvStore.activeNode = {
				parameters: { authentication: 'accessToken' },
				type: 'n8n-nodes-base.dropbox',
				typeVersion: 1,
				position: [0, 0],
				id: 'test-node-id',
				name: 'Test Node',
				credentials: {},
			} as INodeUi;

			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([twoAuthNodeType]);

			const credStore = useCredentialsStore();
			credStore.state.credentialTypes = {
				dropboxApi: dropboxApiType,
				dropboxOAuth2Api: dropboxOAuth2ApiType,
			};

			return pinia;
		}

		it('should show mode selector for existing credential with update permission', () => {
			const pinia = setupMultiAuthStores();

			renderComponent({
				pinia,
				props: {
					isManaged: false,
					mode: 'edit',
					credentialId: 'existing-cred-123',
					credentialType: dropboxApiType,
					credentialProperties: dropboxApiType.properties,
					credentialData: {} as ICredentialDataDecryptedObject,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.getByTestId('credential-mode-selector')).toBeInTheDocument();
		});

		it('should show mode selector for new credential with create permission', () => {
			const pinia = setupMultiAuthStores();

			renderComponent({
				pinia,
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: dropboxApiType,
					credentialProperties: dropboxApiType.properties,
					credentialData: {} as ICredentialDataDecryptedObject,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.getByTestId('credential-mode-selector')).toBeInTheDocument();
		});

		it('should not show mode selector for existing credential without update permission', () => {
			const pinia = setupMultiAuthStores();

			renderComponent({
				pinia,
				props: {
					isManaged: false,
					mode: 'edit',
					credentialId: 'existing-cred-123',
					credentialType: dropboxApiType,
					credentialProperties: dropboxApiType.properties,
					credentialData: {} as ICredentialDataDecryptedObject,
					credentialPermissions: {
						create: false,
						update: false,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.queryByTestId('credential-mode-selector')).not.toBeInTheDocument();
		});
	});

	describe('Docs callout visibility', () => {
		const credentialTypeWithDocs: ICredentialType = {
			name: 'testCredential',
			displayName: 'Test Credential',
			documentationUrl: 'https://example.com/docs',
			properties: [{ displayName: 'Key', name: 'key', type: 'string', default: '' }],
		};

		it('should not show docs callout when user lacks write permission', () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialId: 'existing-cred-123',
					credentialType: credentialTypeWithDocs,
					credentialProperties: credentialTypeWithDocs.properties,
					credentialData: {} as ICredentialDataDecryptedObject,
					credentialPermissions: {
						create: false,
						update: false,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.queryByText('Need help filling out these fields?')).not.toBeInTheDocument();
		});
	});

	describe('Read-only access (view without edit)', () => {
		const credentialTypeWithField: ICredentialType = {
			name: 'testCredential',
			displayName: 'Test Credential',
			properties: [{ displayName: 'Key', name: 'key', type: 'string', default: '' }],
		};

		const readOnlyPermissions = {
			create: false,
			update: false,
			read: true,
			delete: false,
			share: false,
			list: true,
			move: false,
		};

		it('does not render credential inputs for users without edit permission', () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialId: 'existing-cred-123',
					credentialType: credentialTypeWithField,
					credentialProperties: credentialTypeWithField.properties,
					credentialData: { key: 'secret' } as ICredentialDataDecryptedObject,
					credentialPermissions: readOnlyPermissions,
				},
			});

			expect(screen.queryByTestId('credential-connection-parameter')).not.toBeInTheDocument();
		});
	});

	describe('Connect banner gating by connect permission', () => {
		const oAuthNotConnectedProps = {
			isManaged: false,
			mode: 'edit' as const,
			credentialId: 'existing-cred-123',
			credentialType: mockCredentialType,
			credentialProperties: [],
			credentialData: {} as ICredentialDataDecryptedObject,
			isOAuthType: true,
			isOAuthConnected: false,
			requiredPropertiesFilled: true,
			isResolvable: true,
		};

		it('shows the connect button for a private credential when the user can connect', () => {
			renderComponent({
				props: {
					...oAuthNotConnectedProps,
					credentialPermissions: { read: true, connect: true },
				},
			});

			expect(screen.getByTestId('quick-connect-button')).toBeInTheDocument();
		});

		it('hides the connect button for a private credential when the user cannot connect', () => {
			renderComponent({
				props: {
					...oAuthNotConnectedProps,
					credentialPermissions: { read: true, connect: false },
				},
			});

			expect(screen.getByTestId('oauth-not-connected-banner')).toBeInTheDocument();
			expect(screen.queryByTestId('quick-connect-button')).not.toBeInTheDocument();
		});
	});
});
