import CredentialConfig from './CredentialConfig.vue';
import { screen } from '@testing-library/vue';
import type { ICredentialDataDecryptedObject, ICredentialType } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { STORES } from '@n8n/stores';
import { vi } from 'vitest';
import { useCredentialsStore } from '../../credentials.store';
import { addCredentialTranslation } from '@n8n/i18n';

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
		credentialType: {} as ICredentialType,
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
		it('should not display dynamic credentials section when isDynamicCredentialsEnabled is false', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isDynamicCredentialsEnabled: false,
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

			expect(screen.queryByTestId('dynamic-credentials-section')).not.toBeInTheDocument();
		});

		it('should not display dynamic credentials section when isOAuthType is false', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isDynamicCredentialsEnabled: true,
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

			expect(screen.queryByTestId('dynamic-credentials-section')).not.toBeInTheDocument();
		});

		it('should not display dynamic credentials section when user lacks create permission for new credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isDynamicCredentialsEnabled: true,
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

			expect(screen.queryByTestId('dynamic-credentials-section')).not.toBeInTheDocument();
		});

		it('should not display dynamic credentials section when user lacks update permission for existing credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isDynamicCredentialsEnabled: true,
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

			expect(screen.queryByTestId('dynamic-credentials-section')).not.toBeInTheDocument();
		});

		it('should display dynamic credentials section when all conditions are met for new credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isDynamicCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: true,
					isResolvable: false,
					credentialPermissions: {
						create: true,
						update: false,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.getByTestId('dynamic-credentials-section')).toBeInTheDocument();
			expect(screen.getByTestId('dynamic-credentials-toggle')).toBeInTheDocument();
		});

		it('should display dynamic credentials section when all conditions are met for existing credential', async () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'edit',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isDynamicCredentialsEnabled: true,
					isOAuthType: true,
					isNewCredential: false,
					isResolvable: false,
					credentialPermissions: {
						create: false,
						update: true,
						read: true,
						delete: false,
						share: false,
						list: true,
						move: false,
					},
				},
			});

			expect(screen.getByTestId('dynamic-credentials-section')).toBeInTheDocument();
			expect(screen.getByTestId('dynamic-credentials-toggle')).toBeInTheDocument();
		});
	});
});
