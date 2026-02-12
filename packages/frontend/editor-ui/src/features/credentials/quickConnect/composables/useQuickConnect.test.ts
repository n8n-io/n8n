import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { ref } from 'vue';
import { useQuickConnect } from './useQuickConnect';
import type { QuickConnectOption } from '@n8n/api-types';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';

vi.mock('@/app/stores/posthog.store');

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
		useQuickConnect({ packageName: 'test-package' });

		expect(isVariantEnabledMock).toHaveBeenCalledWith(
			QUICK_CONNECT_EXPERIMENT.name,
			QUICK_CONNECT_EXPERIMENT.variant,
		);
	});

	it('returns undefined quickConnectOption by default', () => {
		const { quickConnectOption } = useQuickConnect({ packageName: 'ok' });

		expect(quickConnectOption.value).toBe(undefined);
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
			const { quickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

			expect(quickConnectOption.value).toBe(undefined);
		});

		describe('feature enabled', () => {
			beforeEach(() => {
				isVariantEnabledMock.mockImplementation(() => true);
			});

			describe('{ credentialType, nodeType } mode', () => {
				it('returns option when both credential type and package match', () => {
					const { quickConnectOption } = useQuickConnect({
						credentialType: 'googleSheetsOAuth2Api',
						nodeType: 'n8n-nodes-base.googleSheets',
					});

					expect(quickConnectOption.value).toEqual(quickConnectOptionData);
				});

				it('returns undefined when credential type does not match', () => {
					const { quickConnectOption } = useQuickConnect({
						credentialType: 'slackOAuth2Api',
						nodeType: 'n8n-nodes-base.slack',
					});

					expect(quickConnectOption.value).toBe(undefined);
				});

				it('returns undefined when package name does not match', () => {
					const { quickConnectOption } = useQuickConnect({
						credentialType: 'googleSheetsOAuth2Api',
						nodeType: 'other-package.googleSheets',
					});

					expect(quickConnectOption.value).toBe(undefined);
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

					const { quickConnectOption } = useQuickConnect({
						credentialType: 'openAiApi',
						nodeType: '@n8n.openAi',
					});

					expect(quickConnectOption.value).toBeDefined();
				});

				it('reacts to ref changes', () => {
					const credentialType = ref('nonexistent');
					const nodeType = ref('n8n-nodes-base.googleSheets');
					const { quickConnectOption } = useQuickConnect({ credentialType, nodeType });

					expect(quickConnectOption.value).toBe(undefined);

					credentialType.value = 'googleSheetsOAuth2Api';
					expect(quickConnectOption.value).toEqual(quickConnectOptionData);
				});
			});

			describe('{ credentialTypes } mode', () => {
				it.each([['googleSheetsOAuth2Api'], ref(['googleSheetsOAuth2Api'])])(
					'returns correct option for configured credentials',
					(credentialTypes) => {
						const { quickConnectOption } = useQuickConnect({ credentialTypes });

						expect(quickConnectOption.value).toEqual(quickConnectOptionData);
					},
				);

				it('returns undefined when credentialTypes array is empty', () => {
					const { quickConnectOption } = useQuickConnect({ credentialTypes: [] });

					expect(quickConnectOption.value).toBe(undefined);
				});

				it('returns undefined when no credentialTypes match', () => {
					const { quickConnectOption } = useQuickConnect({
						credentialTypes: ['non-matching-credentials', 'another-non-matching'],
					});

					expect(quickConnectOption.value).toBe(undefined);
				});

				it('returns correct option when one of multiple credentialTypes matches', () => {
					const { quickConnectOption } = useQuickConnect({
						credentialTypes: ['non-matching', 'googleSheetsOAuth2Api', 'another-non-matching'],
					});

					expect(quickConnectOption.value).toEqual(quickConnectOptionData);
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

					const { quickConnectOption } = useQuickConnect({
						credentialTypes: ['googleSheetsOAuth2Api', 'second-credentials'],
					});

					expect(quickConnectOption.value).toEqual(quickConnectOptionData);
				});

				it('updates reactive value based on credential types', () => {
					const credentialTypes = ref(['hello']);
					const { quickConnectOption } = useQuickConnect({ credentialTypes });

					expect(quickConnectOption.value).toBe(undefined);

					credentialTypes.value = ['googleSheetsOAuth2Api'];
					expect(quickConnectOption.value).toEqual(quickConnectOptionData);
				});
			});

			describe('{ packageName } mode', () => {
				it.each(['n8n-nodes-base', ref('n8n-nodes-base')])(
					'returns correct option for configured package',
					(packageName) => {
						const { quickConnectOption } = useQuickConnect({ packageName });

						expect(quickConnectOption.value).toEqual(quickConnectOptionData);
					},
				);

				it('updates reactive value based on package name', () => {
					const packageName = ref('hello');
					const { quickConnectOption } = useQuickConnect({ packageName });

					expect(quickConnectOption.value).toBe(undefined);

					packageName.value = 'n8n-nodes-base';
					expect(quickConnectOption.value).toEqual(quickConnectOptionData);
				});

				it('returns undefined for non-matching package', () => {
					const { quickConnectOption } = useQuickConnect({ packageName: 'other-package' });

					expect(quickConnectOption.value).toBe(undefined);
				});
			});

			describe('getQuickConnectOption()', () => {
				it('returns option when both credential type and package match', () => {
					const { getQuickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toEqual(quickConnectOptionData);
				});

				it('returns undefined when credential type does not match', () => {
					const { getQuickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

					expect(getQuickConnectOption('slackOAuth2Api', 'n8n-nodes-base.slack')).toBe(undefined);
				});

				it('returns undefined when package name does not match', () => {
					const { getQuickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

					expect(getQuickConnectOption('googleSheetsOAuth2Api', 'other-package.googleSheets')).toBe(
						undefined,
					);
				});

				it('returns undefined when feature is disabled', () => {
					isVariantEnabledMock.mockImplementation(() => false);
					const { getQuickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toBe(undefined);
				});

				it('returns undefined when options are empty', () => {
					settingsStore.moduleSettings['quick-connect'] = { options: [] };
					const { getQuickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toBe(undefined);
				});

				it('returns undefined when module settings are missing', () => {
					settingsStore.moduleSettings = {};
					const { getQuickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

					expect(
						getQuickConnectOption('googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'),
					).toBe(undefined);
				});
			});

			it('updates reactive value based on settings store', () => {
				const { quickConnectOption } = useQuickConnect({ packageName: 'n8n-nodes-base' });

				expect(quickConnectOption.value).toEqual(quickConnectOptionData);

				settingsStore.moduleSettings['quick-connect'] = {
					options: [],
				};

				expect(quickConnectOption.value).toBe(undefined);
			});
		});
	});
});
