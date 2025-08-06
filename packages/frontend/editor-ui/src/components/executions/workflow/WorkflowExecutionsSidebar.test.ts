import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import WorkflowExecutionsSidebar from '@/components/executions/workflow/WorkflowExecutionsSidebar.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';
import { expect, it } from 'vitest';

vi.mock('vue-router', () => {
	const location = {};
	return {
		useRouter: vi.fn(),
		useRoute: () => ({
			location,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(WorkflowExecutionsSidebar, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.EXECUTIONS]: {
				executions: [],
			},
			[STORES.SETTINGS]: {
				settings: merge(SETTINGS_STORE_DEFAULT_STATE.settings, {
					enterprise: {
						advancedExecutionFilters: true,
					},
				}),
			},
		},
	}),
});

let settingsStore: MockedStore<typeof useSettingsStore>;

describe('WorkflowExecutionsSidebar', () => {
	beforeEach(() => {
		settingsStore = mockedStore(useSettingsStore);
	});

	it('should not throw error when opened', async () => {
		expect(() =>
			renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					executions: [],
				},
			}),
		).not.toThrow();
	});

	it('should render concurrent executions header if the feature is enabled', async () => {
		settingsStore.concurrency = 5;
		const { getByTestId } = renderComponent({
			props: {
				loading: false,
				loadingMore: false,
				executions: [],
			},
		});

		expect(getByTestId('concurrent-executions-header')).toBeVisible();
	});
});
