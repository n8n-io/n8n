import { ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import FocusSidebarTabs from '@/features/setupPanel/components/FocusSidebarTabs.vue';

const isSetupPanelEnabled = ref(true);
vi.mock('@/features/setupPanel/setupPanel.store', () => ({
	useSetupPanelStore: () => ({
		get isFeatureEnabled() {
			return isSetupPanelEnabled.value;
		},
	}),
}));

const isEvaluationsEnabled = ref(false);
vi.mock('@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment', () => ({
	useEvaluationsWizardSidepanelExperiment: () => ({ isFeatureEnabled: isEvaluationsEnabled }),
}));

const renderComponent = createComponentRenderer(FocusSidebarTabs);

describe('FocusSidebarTabs', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		isSetupPanelEnabled.value = true;
		isEvaluationsEnabled.value = false;
	});

	it('should render tabs with default labels', () => {
		const { getByText } = renderComponent();

		expect(getByText('Setup')).toBeInTheDocument();
		expect(getByText('Focus')).toBeInTheDocument();
	});

	it('should render custom setup tab label when provided', () => {
		const { getByText, queryByText } = renderComponent({
			props: {
				tabLabels: { setup: 'Custom Setup' },
			},
		});

		expect(getByText('Custom Setup')).toBeInTheDocument();
		expect(queryByText('Setup')).not.toBeInTheDocument();
		expect(getByText('Focus')).toBeInTheDocument();
	});

	it('should render custom focus tab label when provided', () => {
		const { getByText, queryByText } = renderComponent({
			props: {
				tabLabels: { focus: 'Custom Focus' },
			},
		});

		expect(getByText('Setup')).toBeInTheDocument();
		expect(getByText('Custom Focus')).toBeInTheDocument();
		expect(queryByText('Focus')).not.toBeInTheDocument();
	});

	it('should render both custom labels when provided', () => {
		const { getByText, queryByText } = renderComponent({
			props: {
				tabLabels: { setup: 'My Setup', focus: 'My Focus' },
			},
		});

		expect(getByText('My Setup')).toBeInTheDocument();
		expect(getByText('My Focus')).toBeInTheDocument();
		expect(queryByText('Setup')).not.toBeInTheDocument();
		expect(queryByText('Focus')).not.toBeInTheDocument();
	});

	it('hides the Setup tab when the setup feature is disabled', () => {
		isSetupPanelEnabled.value = false;
		isEvaluationsEnabled.value = true;
		const { getByText, queryByText } = renderComponent();

		expect(queryByText('Setup')).not.toBeInTheDocument();
		expect(getByText('Focus')).toBeInTheDocument();
		expect(getByText('Evaluations')).toBeInTheDocument();
	});

	it('should emit update:modelValue when a tab is clicked', async () => {
		const { getByText, emitted } = renderComponent({
			props: {
				modelValue: 'setup',
			},
		});

		getByText('Focus').click();

		expect(emitted('update:modelValue')).toEqual([['focus']]);
	});

	it('should switch selected tab when modelValue changes', async () => {
		const { getByText, emitted, rerender } = renderComponent({
			props: {
				modelValue: 'setup',
			},
		});

		getByText('Focus').click();
		expect(emitted('update:modelValue')).toEqual([['focus']]);

		// Simulate parent updating the modelValue
		await rerender({ modelValue: 'focus' });

		getByText('Setup').click();
		expect(emitted('update:modelValue')).toEqual([['focus'], ['setup']]);
	});
});
