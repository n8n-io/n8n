import { createTestingPinia } from '@pinia/testing';
import type { FrontendSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import EnvFeatureFlag from '@/features/env-feature-flag/EnvFeatureFlag.vue';
import { useSettingsStore } from '@/stores/settings.store';

let pinia: ReturnType<typeof createTestingPinia>;
const renderComponent = createComponentRenderer(EnvFeatureFlag, {
	pinia,
});

describe('EnvFeatureFlag', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;

	beforeEach(() => {
		pinia = createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = {
			envFeatureFlags: {},
		} as FrontendSettings;
	});

	test.each([
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
			const envKey = `FEAT_${flagName}`;

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

	it('should render wrapper div regardless of feature flag state', () => {
		const { container } = renderComponent({
			props: {
				name: 'TEST_FLAG',
			},
			slots: {
				default: '<div>Feature content</div>',
			},
		});

		expect(container.querySelectorAll('div')).toHaveLength(1);
	});

	it('should work with different flag names', () => {
		settingsStore.settings.envFeatureFlags = {
			FEAT_WORKFLOW_DIFFS: 'true',
			FEAT_ANOTHER_FEATURE: 'false',
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
});
