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

const aiRootNodes = ref<Array<{ name: string; type: string }>>([]);
vi.mock('@/features/ai/evaluation.ee/composables/useAiRootNodes', () => ({
	useAiRootNodes: () => aiRootNodes,
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	const { useWorkflowsStore } = await import('@/app/stores/workflows.store');
	return {
		useWorkflowId: () => computed(() => useWorkflowsStore().workflowId),
		useRouteWorkflowId: () => computed(() => useWorkflowsStore().workflowId),
	};
});

const renderComponent = createComponentRenderer(FocusSidebarTabs);

describe('FocusSidebarTabs', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		isSetupPanelEnabled.value = true;
		isEvaluationsEnabled.value = false;
		aiRootNodes.value = [];
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
		aiRootNodes.value = [{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }];
		const { getByText, queryByText } = renderComponent();

		expect(queryByText('Setup')).not.toBeInTheDocument();
		expect(getByText('Focus')).toBeInTheDocument();
		expect(getByText('Evaluations')).toBeInTheDocument();
	});

	it('shows the Evaluations tab when the experiment is enabled and an AI root node is present', () => {
		isEvaluationsEnabled.value = true;
		aiRootNodes.value = [{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }];
		const { getByText } = renderComponent();

		expect(getByText('Evaluations')).toBeInTheDocument();
	});

	it('shows the Evaluations tab when the experiment is enabled even without an AI root node', () => {
		// The Tests panel renders its own "add a node first" empty state, so the tab
		// must stay reachable regardless of whether the workflow has an AI node.
		isEvaluationsEnabled.value = true;
		aiRootNodes.value = [];
		const { getByText } = renderComponent();

		expect(getByText('Evaluations')).toBeInTheDocument();
	});

	it('hides the Evaluations tab when the experiment is disabled', () => {
		isEvaluationsEnabled.value = false;
		aiRootNodes.value = [{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }];
		const { queryByText } = renderComponent();

		expect(queryByText('Evaluations')).not.toBeInTheDocument();
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
