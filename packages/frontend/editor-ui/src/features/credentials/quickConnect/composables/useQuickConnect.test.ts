import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useQuickConnect } from './useQuickConnect';
import type { QuickConnectOption } from '@n8n/api-types';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';
import type * as i18n from '@n8n/i18n';

vi.mock('@/app/stores/posthog.store');
vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return { useTelemetry: () => ({ track }) };
});
const { mockIsOAuthCredentialType, mockCreateAndAuthorize, mockCancelAuthorize } = vi.hoisted(
	() => ({
		mockIsOAuthCredentialType: vi.fn(() => false),
		mockCreateAndAuthorize: vi.fn(),
		mockCancelAuthorize: vi.fn(),
	}),
);
vi.mock('../../composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		isOAuthCredentialType: mockIsOAuthCredentialType,
		createAndAuthorize: mockCreateAndAuthorize,
		cancelAuthorize: mockCancelAuthorize,
	}),
}));

const { mockToastShowError } = vi.hoisted(() => ({
	mockToastShowError: vi.fn(),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: mockToastShowError,
	}),
}));

const { mockI18nBaseText } = vi.hoisted(() => ({
	mockI18nBaseText: vi.fn((key: string) => key),
}));
vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal<typeof i18n>();
	return {
		...actual,
		useI18n: () => ({
			baseText: mockI18nBaseText,
		}),
	};
});

const { mockPineconeConnectPopup } = vi.hoisted(() => ({
	mockPineconeConnectPopup: vi.fn(),
}));
vi.mock('@pinecone-database/connect', () => ({
	ConnectPopup: mockPineconeConnectPopup,
}));

const { mockGetCredentialTypeByName, mockCreateNewCredential, mockCurrentProject } = vi.hoisted(
	() => ({
		mockGetCredentialTypeByName: vi.fn(),
		mockCreateNewCredential: vi.fn(),
		mockCurrentProject: { id: 'project-123', name: 'Test Project' } as unknown,
	}),
);

vi.mock('../../credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialTypeByName: mockGetCredentialTypeByName,
		createNewCredential: mockCreateNewCredential,
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProject: mockCurrentProject,
	}),
}));

describe('useQuickConnect()', () => {
	const isVariantEnabledMock = vi.fn(() => false);
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		setActivePinia(
			createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: merge({}, SETTINGS_STORE_DEFAULT_STATE),
				},
			}),
		);

		// @ts-expect-error only isVariantEnabled is used from the store
		vi.mocked(usePostHog).mockReturnValue({
			isVariantEnabled: isVariantEnabledMock,
		});

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.moduleSettings['quick-connect'] = undefined;
	});

	it('checks if feature is enabled through posthog', () => {
		const { isQuickConnectEnabled } = useQuickConnect();

		// Access computed to trigger evaluation
		void isQuickConnectEnabled.value;

		expect(isVariantEnabledMock).toHaveBeenCalledWith(
			QUICK_CONNECT_EXPERIMENT.name,
			QUICK_CONNECT_EXPERIMENT.variant,
		);
	});

	it('returns undefined from all getters by default', () => {
		const {
			getQuickConnectOption,
			getQuickConnectOptionByPackageName,
			getQuickConnectOptionByCredentialTypes,
		} = useQuickConnect();

		expect(getQuickConnectOption('any', 'any.node')).toBe(undefined);
		expect(getQuickConnectOptionByPackageName('any')).toBe(undefined);
		expect(getQuickConnectOptionByCredentialTypes(['any'])).toBe(undefined);
	});

	describe('quick connect configured', () => {
		const quickConnectOptionData: QuickConnectOption = {
			packageName: 'n8n-nodes-base',
			credentialType: 'googleSheetsOAuth2Api',
			text: 'Google Sheets',
			quickConnectType: 'oauth',
			serviceName: 'Google Sheets',
		};

		beforeEach(() => {
			settingsStore.moduleSettings['quick-connect'] = {
				options: [quickConnectOptionData],
			};
		});

		it('returns undefined when feature is disabled', () => {
			const { getQuickConnectOptionByPackageName } = useQuickConnect();

			expect(getQuickConnectOptionByPackageName('n8n-nodes-base')).toBe(undefined);
		});

		describe('feature enabled', () => {
			beforeEach(() => {
				isVariantEnabledMock.mockImplementation(() => true);
			});

			describe('getQuickConnectOption()', () => {
				it('returns option when both credential type and package match', () => {
					const { getQuickConnectOption } = useQuickConnect();

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toEqual(quickConnectOptionData);
				});

				it('returns undefined when credential type does not match', () => {
					const { getQuickConnectOption } = useQuickConnect();

					expect(getQuickConnectOption('slackOAuth2Api', 'n8n-nodes-base.slack')).toBe(undefined);
				});

				it('returns undefined when package name does not match', () => {
					const { getQuickConnectOption } = useQuickConnect();

					expect(getQuickConnectOption('googleSheetsOAuth2Api', 'other-package.googleSheets')).toBe(
						undefined,
					);
				});

				it('extracts package name from node type by splitting on first dot', () => {
					settingsStore.moduleSettings['quick-connect'] = {
						options: [
							{
								packageName: '@n8n',
								credentialType: 'openAiApi',
								text: 'OpenAI',
								quickConnectType: 'oauth',
								serviceName: 'OpenAI',
							},
						],
					};

					const { getQuickConnectOption } = useQuickConnect();

					expect(getQuickConnectOption('openAiApi', '@n8n.openAi')).toBeDefined();
				});

				it('returns undefined when feature is disabled', () => {
					isVariantEnabledMock.mockImplementation(() => false);
					const { getQuickConnectOption } = useQuickConnect();

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toBe(undefined);
				});

				it('returns undefined when options are empty', () => {
					settingsStore.moduleSettings['quick-connect'] = { options: [] };
					const { getQuickConnectOption } = useQuickConnect();

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toBe(undefined);
				});

				it('returns undefined when module settings are missing', () => {
					settingsStore.moduleSettings = {};
					const { getQuickConnectOption } = useQuickConnect();

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toBe(undefined);
				});
			});

			describe('getQuickConnectOptionByCredentialTypes()', () => {
				it('returns correct option for configured credentials', () => {
					const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();

					expect(getQuickConnectOptionByCredentialTypes(['googleSheetsOAuth2Api'])).toEqual(
						quickConnectOptionData,
					);
				});

				it('returns undefined when credentialTypes array is empty', () => {
					const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();

					expect(getQuickConnectOptionByCredentialTypes([])).toBe(undefined);
				});

				it('returns undefined when no credentialTypes match', () => {
					const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();

					expect(
						getQuickConnectOptionByCredentialTypes([
							'non-matching-credentials',
							'another-non-matching',
						]),
					).toBe(undefined);
				});

				it('returns correct option when one of multiple credentialTypes matches', () => {
					const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();

					expect(
						getQuickConnectOptionByCredentialTypes([
							'non-matching',
							'googleSheetsOAuth2Api',
							'another-non-matching',
						]),
					).toEqual(quickConnectOptionData);
				});

				it('returns first matching option when multiple credentialTypes match', () => {
					const secondOption: QuickConnectOption = {
						packageName: 'second-package',
						credentialType: 'second-credentials',
						text: 'second promotion text',
						quickConnectType: 'manual',
						serviceName: 'Other test service',
					};

					settingsStore.moduleSettings['quick-connect'] = {
						options: [quickConnectOptionData, secondOption],
					};

					const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();

					expect(
						getQuickConnectOptionByCredentialTypes(['googleSheetsOAuth2Api', 'second-credentials']),
					).toEqual(quickConnectOptionData);
				});
			});

			describe('getQuickConnectOptionByPackageName()', () => {
				it('returns correct option for configured package', () => {
					const { getQuickConnectOptionByPackageName } = useQuickConnect();

					expect(getQuickConnectOptionByPackageName('n8n-nodes-base')).toEqual(
						quickConnectOptionData,
					);
				});

				it('returns undefined for non-matching package', () => {
					const { getQuickConnectOptionByPackageName } = useQuickConnect();

					expect(getQuickConnectOptionByPackageName('other-package')).toBe(undefined);
				});
			});

			it('reacts to settings store changes', () => {
				const { getQuickConnectOptionByPackageName } = useQuickConnect();

				expect(getQuickConnectOptionByPackageName('n8n-nodes-base')).toEqual(
					quickConnectOptionData,
				);

				settingsStore.moduleSettings['quick-connect'] = {
					options: [],
				};

				expect(getQuickConnectOptionByPackageName('n8n-nodes-base')).toBe(undefined);
			});

			describe('connect()', () => {
				it('tracks telemetry when called', async () => {
					const { connect } = useQuickConnect();
					const telemetry = useTelemetry();

					await connect({
						credentialTypeName: 'googleSheetsOAuth2Api',
						nodeType: 'n8n-nodes-base.googleSheets',
						source: 'node',
					});

					expect(telemetry.track).toHaveBeenCalledWith('User clicked quick connect button', {
						source: 'node',
						credential_type: 'googleSheetsOAuth2Api',
						node_type: 'n8n-nodes-base.googleSheets',
					});
				});

				it('passes nodeType to createAndAuthorize for OAuth credentials', async () => {
					mockIsOAuthCredentialType.mockReturnValue(true);
					mockCreateAndAuthorize.mockResolvedValue(null);

					const { connect } = useQuickConnect();
					await connect({
						credentialTypeName: 'slackOAuth2Api',
						nodeType: 'n8n-nodes-base.slack',
						source: 'node',
					});

					expect(mockCreateAndAuthorize).toHaveBeenCalledWith(
						'slackOAuth2Api',
						'n8n-nodes-base.slack',
					);
				});

				describe('pinecone quick connect', () => {
					const pineconeOption: QuickConnectOption = {
						packageName: '@n8n/n8n-nodes-langchain',
						credentialType: 'pineconeApi',
						text: 'Pinecone',
						quickConnectType: 'pinecone',
						serviceName: 'Pinecone',
						config: {
							integrationId: 'test-integration-id',
						},
					};

					beforeEach(() => {
						settingsStore.moduleSettings['quick-connect'] = {
							options: [pineconeOption],
						};
					});

					it('creates credential with API key from Pinecone popup', async () => {
						const mockPopup = {
							open: vi.fn(),
						};
						mockPineconeConnectPopup.mockImplementation(({ onConnect }) => {
							// Simulate user connecting and providing API key
							setTimeout(() => onConnect({ key: 'test-api-key-123' }), 0);
							return mockPopup;
						});

						mockGetCredentialTypeByName.mockReturnValue({
							name: 'pineconeApi',
							displayName: 'Pinecone API',
							properties: [],
						});

						const mockCredential = {
							id: 'cred-123',
							name: 'Pinecone API',
							type: 'pineconeApi',
							data: {
								apiKey: 'test-api-key-123',
								allowedHttpRequestDomains: 'none',
							},
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							isManaged: false,
						};
						mockCreateNewCredential.mockResolvedValue(mockCredential);

						const { connect } = useQuickConnect();
						const result = await connect({
							credentialTypeName: 'pineconeApi',
							nodeType: '@n8n/n8n-nodes-langchain.pinecone',
							source: 'node',
						});

						expect(mockPineconeConnectPopup).toHaveBeenCalledWith({
							onConnect: expect.any(Function),
							onCancel: expect.any(Function),
							integrationId: 'test-integration-id',
						});
						expect(mockPopup.open).toHaveBeenCalled();
						expect(mockCreateNewCredential).toHaveBeenCalledWith(
							{
								id: '',
								name: 'Pinecone API',
								type: 'pineconeApi',
								data: {
									apiKey: 'test-api-key-123',
									allowedHttpRequestDomains: 'none',
								},
							},
							'project-123',
						);
						expect(result).toEqual(mockCredential);
					});

					it('returns null when credential type is not found', async () => {
						mockGetCredentialTypeByName.mockReturnValue(null);

						const { connect } = useQuickConnect();
						const result = await connect({
							credentialTypeName: 'pineconeApi',
							nodeType: '@n8n/n8n-nodes-langchain.pinecone',
							source: 'node',
						});

						expect(result).toBeNull();
						expect(mockPineconeConnectPopup).not.toHaveBeenCalled();
					});

					it('shows error toast when Pinecone connection is cancelled', async () => {
						const mockPopup = {
							open: vi.fn(),
						};
						mockPineconeConnectPopup.mockImplementation(({ onCancel }) => {
							// Simulate user cancelling the connection
							setTimeout(() => onCancel(), 0);
							return mockPopup;
						});

						mockGetCredentialTypeByName.mockReturnValue({
							name: 'pineconeApi',
							displayName: 'Pinecone API',
							properties: [],
						});

						const { connect } = useQuickConnect();
						const result = await connect({
							credentialTypeName: 'pineconeApi',
							nodeType: '@n8n/n8n-nodes-langchain.pinecone',
							source: 'node',
						});

						expect(result).toBeNull();
						expect(mockToastShowError).toHaveBeenCalledWith(
							undefined,
							'credentialEdit.credentialEdit.showError.createCredential.title',
						);
					});

					it('shows error toast when credential creation fails', async () => {
						const mockPopup = {
							open: vi.fn(),
						};
						mockPineconeConnectPopup.mockImplementation(({ onConnect }) => {
							setTimeout(() => onConnect({ key: 'test-api-key-123' }), 0);
							return mockPopup;
						});

						mockGetCredentialTypeByName.mockReturnValue({
							name: 'pineconeApi',
							displayName: 'Pinecone API',
							properties: [],
						});

						const error = new Error('Failed to create credential');
						mockCreateNewCredential.mockRejectedValue(error);

						const { connect } = useQuickConnect();
						const result = await connect({
							credentialTypeName: 'pineconeApi',
							nodeType: '@n8n/n8n-nodes-langchain.pinecone',
							source: 'node',
						});

						expect(result).toBeNull();
						expect(mockToastShowError).toHaveBeenCalledWith(
							error,
							'credentialEdit.credentialEdit.showError.createCredential.title',
						);
					});

					it('throws error for unsupported quick connect type', async () => {
						const unsupportedOption: QuickConnectOption = {
							packageName: 'test-package',
							credentialType: 'testApi',
							text: 'Test',
							quickConnectType: 'unsupported-type',
							serviceName: 'Test Service',
						};

						settingsStore.moduleSettings['quick-connect'] = {
							options: [unsupportedOption],
						};

						mockGetCredentialTypeByName.mockReturnValue({
							name: 'testApi',
							displayName: 'Test API',
							properties: [],
						});

						const { connect } = useQuickConnect();
						const result = await connect({
							credentialTypeName: 'testApi',
							nodeType: 'test-package.testNode',
							source: 'node',
						});

						expect(result).toBeNull();
						expect(mockToastShowError).toHaveBeenCalledWith(
							expect.objectContaining({
								message: 'Quick connect for type unsupported-type is not implemented',
							}),
							'credentialEdit.credentialEdit.showError.createCredential.title',
						);
					});
				});
			});
		});
	});
});
