import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryButton from '@/components/MainHeader/WorkflowHistoryButton.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { EnterpriseEditionFeature } from '@/constants';
import type { IN8nUISettings } from 'n8n-workflow/src';

vi.mock('vue-router', () => ({
	useRoute: () => vi.fn(),
	useRouter: () => vi.fn(),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(WorkflowHistoryButton, {
	global: {
		stubs: {
			RouterLink: true,
			'router-link': {
				template: '<div><slot /></div>',
			},
		},
	},
});

let pinia: ReturnType<typeof createPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;

const workflow = {
	id: '1',
	name: 'Test Workflow',
	tags: ['1', '2'],
	active: false,
};

describe('WorkflowHistoryButton', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		settingsStore.settings = {
			enterprise: {},
		} as IN8nUISettings;
	});

	it('should be disabled if the feature is disabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.WorkflowHistory] = false;

		const { getByRole } = renderComponent({
			props: {
				workflow,
				isNewWorkflow: false,
			},
		});
		expect(getByRole('button')).toBeDisabled();
	});

	it('should be disabled if the feature is enabled but the workflow is new', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.WorkflowHistory] = true;

		const { getByRole } = renderComponent({
			props: {
				workflow,
				isNewWorkflow: true,
			},
		});
		expect(getByRole('button')).toBeDisabled();
	});

	it('should be enabled if the feature is enabled and the workflow is not new', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.WorkflowHistory] = true;

		const { getByRole } = renderComponent({
			props: {
				workflow,
				isNewWorkflow: false,
			},
		});
		expect(getByRole('button')).toBeEnabled();
	});
});
