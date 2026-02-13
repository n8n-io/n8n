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

	it('returns undefined per default', () => {
		const quickConnect = useQuickConnect({ packageName: 'ok' });

		expect(quickConnect.value).toBe(undefined);
	});

	describe('Quick connect configured', () => {
		const quickConnectOption: QuickConnectOption = {
			packageName: 'test-package',
			credentialType: 'test-credentials',
			text: 'this is a promotion text',
			quickConnectType: 'manual',
			serviceName: 'Test service',
		};

		beforeEach(() => {
			settingsStore.moduleSettings['quick-connect'] = {
				options: [quickConnectOption],
			};
		});

		it('returns undefined when package is configured but quick connect feature is disabled', () => {
			const quickConnect = useQuickConnect({ packageName: 'test-package' });

			expect(quickConnect.value).toBe(undefined);
		});

		it('returns undefined when credentialTypes are configured but quick connect feature is disabled', () => {
			const quickConnect = useQuickConnect({ credentialTypes: ['test-credentials'] });

			expect(quickConnect.value).toBe(undefined);
		});

		describe('Quick connect is enabled', () => {
			beforeEach(() => {
				isVariantEnabledMock.mockImplementation(() => true);
			});

			it('checks if feature is enabled through posthog', () => {
				useQuickConnect({ packageName: 'test-package' });

				expect(isVariantEnabledMock).toHaveBeenCalledWith(
					QUICK_CONNECT_EXPERIMENT.name,
					QUICK_CONNECT_EXPERIMENT.variant,
				);
			});

			it.each(['test-package', ref('test-package')])(
				'returns correct option for configured package',
				(packageName) => {
					const quickConnect = useQuickConnect({ packageName });

					expect(quickConnect.value).toEqual(quickConnectOption);
				},
			);

			it.each([['test-credentials'], ref(['test-credentials'])])(
				'returns correct option for configured credentials',
				(credentialTypes) => {
					const quickConnect = useQuickConnect({ credentialTypes });

					expect(quickConnect.value).toEqual(quickConnectOption);
				},
			);

			it('updates reactive value based on package name', () => {
				const packageName = ref('hello');
				const quickConnect = useQuickConnect({ packageName });

				expect(quickConnect.value).toEqual(undefined);

				packageName.value = 'test-package';
				expect(quickConnect.value).toEqual(quickConnectOption);
			});

			it('updates reactive value based on credential types', () => {
				const credentialTypes = ref(['hello']);
				const quickConnect = useQuickConnect({ credentialTypes });

				expect(quickConnect.value).toEqual(undefined);

				credentialTypes.value = ['test-credentials'];
				expect(quickConnect.value).toEqual(quickConnectOption);
			});

			it('updates reactive value based settings store', () => {
				const quickConnect = useQuickConnect({ packageName: 'test-package' });

				expect(quickConnect.value).toEqual(quickConnectOption);

				settingsStore.moduleSettings['quick-connect'] = {
					options: [],
				};

				expect(quickConnect.value).toEqual(undefined);
			});

			it('returns undefined when credentialTypes array is empty', () => {
				const quickConnect = useQuickConnect({ credentialTypes: [] });

				expect(quickConnect.value).toBe(undefined);
			});

			it('returns undefined when no credentialTypes match', () => {
				const quickConnect = useQuickConnect({
					credentialTypes: ['non-matching-credentials', 'another-non-matching'],
				});

				expect(quickConnect.value).toBe(undefined);
			});

			it('returns correct option when one of multiple credentialTypes matches', () => {
				const quickConnect = useQuickConnect({
					credentialTypes: ['non-matching', 'test-credentials', 'another-non-matching'],
				});

				expect(quickConnect.value).toEqual(quickConnectOption);
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
					options: [quickConnectOption, secondOption],
				};

				const quickConnect = useQuickConnect({
					credentialTypes: ['test-credentials', 'second-credentials'],
				});

				expect(quickConnect.value).toEqual(quickConnectOption);
			});
		});
	});
});
