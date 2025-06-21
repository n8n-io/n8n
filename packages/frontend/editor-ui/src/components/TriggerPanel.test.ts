import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TriggerPanel from './TriggerPanel.vue';

// Stubs for child components
const NodeExecuteButton = {
	template: '<button data-test-id="trigger-execute-button" />',
	props: ['nodeName', 'size', 'telemetrySource'],
};
const CopyInput = { template: '<div />', props: ['value'] };
const NodeIcon = { template: '<div />', props: ['nodeType', 'size'] };

// Mock stores and composables
vi.mock('@/stores/ui.store', () => ({ useUIStore: () => ({ openModal: vi.fn() }) }));
vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		getNodeByName: () => ({ type: 'webhook', parameters: {}, issues: undefined }),
		isWorkflowRunning: false,
		isWorkflowActive: false,
		executionWaitingForWebhook: false,
		executedNode: null,
		workflowId: '1',
	}),
}));
vi.mock('@/stores/ndv.store', () => ({ useNDVStore: () => ({ activeNodeName: null }) }));
vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => ({ name: 'webhook', webhooks: [{}] }),
		isTriggerNode: () => true,
	}),
}));
vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		getCurrentWorkflow: () => ({ expression: { getSimpleParameterValue: () => false } }),
		getWebhookExpressionValue: () => 'POST',
		getWebhookUrl: () => 'https://test.url/webhook',
	}),
}));
vi.mock('@/composables/useI18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: vi.fn() }) }));
vi.mock('@/utils/nodeTypesUtils', () => ({ getTriggerNodeServiceName: () => 'Webhook' }));
vi.mock('@/utils/typeGuards', () => ({ isTriggerPanelObject: () => false }));
vi.mock('@n8n/utils/event-bus', () => ({ createEventBus: () => ({ emit: vi.fn() }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('TriggerPanel', () => {
	it('renders the trigger execute button', () => {
		const wrapper = mount(TriggerPanel, {
			props: {
				nodeName: 'Webhook Trigger',
				pushRef: '',
			},
			global: {
				components: {
					NodeExecuteButton,
					CopyInput,
					NodeIcon,
				},
			},
		});
		const button = wrapper.find('[data-test-id="trigger-execute-button"]');
		expect(button.exists()).toBe(true);
	});
});
