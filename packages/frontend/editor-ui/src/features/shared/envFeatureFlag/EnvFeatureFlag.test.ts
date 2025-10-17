import { createTestingPinia } from '@pinia/testing';
import type { FrontendSettings, N8nEnvFeatFlags, N8nEnvFeatFlagValue } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import EnvFeatureFlag from '@/features/env-feature-flag/EnvFeatureFlag.vue';
import { useSettingsStore } from '@/stores/settings.store';

const renderComponent = createComponentRenderer(EnvFeatureFlag);

describe('EnvFeatureFlag', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;
	const originalEnv = { ...import.meta.env };

	beforeEach(() => {
		Object.keys(import.meta.env).forEach((key) => {
			if (key.startsWith('N8N_ENV_FEAT_')) {
				delete (import.meta.env as N8nEnvFeatFlags)[key as keyof N8nEnvFeatFlags];
			}
		});
		createTestingPinia();

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = {
			envFeatureFlags: {},
		} as FrontendSettings;
	});

	afterEach(() => {
		Object.assign(import.meta.env, originalEnv);
	});

	test.each<[N8nEnvFeatFlagValue, Uppercase<string>, boolean]>([
		// Truthy values that should render content
		['true', 'TEST_FLAG', true],
		['enabled', 'TEST_FLAG', true],
		['yes', 'TEST_FLAG', true],
		['1', 'TEST_FLAG', true],
		['on', 'TEST_FLAG', true],
		[true, 'TEST_FLAG', true],

		// Falsy values that should not render content
		['false', 'TEST_FLAG', false],
		[false, 'TEST_FLAG', false],
		['', 'TEST_FLAG', false],
		[undefined, 'TEST_FLAG', false],
		[0, 'TEST_FLAG', false],
	])(
		'should %s render slot content when feature flag value is %s',
		(value, flagName, shouldRender) => {
			const envKey: keyof N8nEnvFeatFlags = `N8N_ENV_FEAT_${flagName}`;

			settingsStore.settings.envFeatureFlags = {
				[envKey]: value,
			};

			const { container } = renderComponent({
				props: {
					name: flagName,
				},
				slots: {
					default: '<div data-testid="slot-content">Feature content</div>',
				},
			});

			if (shouldRender) {
				expect(container.querySelector('[data-testid="slot-content"]')).toBeTruthy();
			} else {
				expect(container.querySelector('[data-testid="slot-content"]')).toBeNull();
			}
		},
	);

	it('should work with different flag names', () => {
		settingsStore.settings.envFeatureFlags = {
			N8N_ENV_FEAT_WORKFLOW_DIFFS: 'true',
			N8N_ENV_FEAT_ANOTHER_FEATURE: 'false',
		};

		const { container: container1 } = renderComponent({
			props: {
				name: 'WORKFLOW_DIFFS',
			},
			slots: {
				default: '<div data-testid="feature-1">Feature 1</div>',
			},
		});

		const { container: container2 } = renderComponent({
			props: {
				name: 'ANOTHER_FEATURE',
			},
			slots: {
				default: '<div data-testid="feature-2">Feature 2</div>',
			},
		});

		expect(container1.querySelector('[data-testid="feature-1"]')).toBeTruthy();
		expect(container2.querySelector('[data-testid="feature-2"]')).toBeNull();
	});

	describe('runtime vs build-time priority', () => {
		it('should prioritize runtime settings over build-time env vars', () => {
			// Set build-time env var
			(import.meta.env as N8nEnvFeatFlags).N8N_ENV_FEAT_TEST_FLAG = 'true';

			// Set runtime setting to override
			settingsStore.settings.envFeatureFlags = {
				N8N_ENV_FEAT_TEST_FLAG: 'false',
			};

			const { container } = renderComponent({
				props: {
					name: 'TEST_FLAG',
				},
				slots: {
					default: '<div data-testid="slot-content">Feature content</div>',
				},
			});

			// Should use runtime value (false) over build-time value (true)
			expect(container.querySelector('[data-testid="slot-content"]')).toBeNull();
		});

		it('should fallback to build-time env vars when runtime settings are not available', () => {
			// Set build-time env var
			(import.meta.env as N8nEnvFeatFlags).N8N_ENV_FEAT_TEST_FLAG = 'true';

			// Runtime settings are empty
			settingsStore.settings.envFeatureFlags = {};

			const { container } = renderComponent({
				props: {
					name: 'TEST_FLAG',
				},
				slots: {
					default: '<div data-testid="slot-content">Feature content</div>',
				},
			});

			// Should use build-time value
			expect(container.querySelector('[data-testid="slot-content"]')).toBeTruthy();
		});

		it('should return false when neither runtime nor build-time values are set', () => {
			// No runtime setting
			settingsStore.settings.envFeatureFlags = {};

			// No build-time env var (already cleared in beforeEach)

			const { container } = renderComponent({
				props: {
					name: 'TEST_FLAG',
				},
				slots: {
					default: '<div data-testid="slot-content">Feature content</div>',
				},
			});

			// Should default to false
			expect(container.querySelector('[data-testid="slot-content"]')).toBeNull();
		});
	});
});
