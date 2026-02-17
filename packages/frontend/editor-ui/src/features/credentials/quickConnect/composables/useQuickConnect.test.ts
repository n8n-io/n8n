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

describe('useQuickConnect()', () => {
	const isVariantEnabledMock = vi.fn(() => false);
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	beforeEach(() => {
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
			});
		});
	});
});
