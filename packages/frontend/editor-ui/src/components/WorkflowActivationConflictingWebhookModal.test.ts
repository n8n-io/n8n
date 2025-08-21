import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowActivationConflictingWebhookModal from '@/components/WorkflowActivationConflictingWebhookModal.vue';
import {
	SLACK_TRIGGER_NODE_TYPE,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
} from '@/constants';

import { waitFor } from '@testing-library/vue';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

vi.mock('@/stores/ui.store', () => {
	return {
		useUIStore: vi.fn(() => ({
			closeModal: vi.fn(),
		})),
	};
});
vi.mock('@n8n/stores/useRootStore', () => {
	return {
		useRootStore: vi.fn(() => ({
			webhookUrl: 'http://webhook-base',
			urlBaseEditor: 'http://editor-base',
		})),
	};
});

const renderComponent = createComponentRenderer(WorkflowActivationConflictingWebhookModal, {
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

describe('WorkflowActivationConflictingWebhookModal', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should render webhook conflict modal', async () => {
		const props = {
			modalName: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerName: 'Trigger in this workflow',
				workflowName: 'Test Workflow',
				triggerType: WEBHOOK_NODE_TYPE,
				workflowId: '123',
				webhookPath: 'webhook-path',
				method: 'GET',
				node: 'Node in workflow',
			},
		};

		const wrapper = renderComponent({ props });
		await waitFor(() => {
			expect(wrapper.queryByTestId('conflicting-webhook-callout')).toBeInTheDocument();
		});

		expect(wrapper.getByTestId('conflicting-webhook-callout')).toHaveTextContent(
			"A webhook trigger 'Node in workflow' in the workflow 'Test Workflow' uses a conflicting URL path, so this workflow cannot be activated",
		);
		expect(wrapper.getByTestId('conflicting-webhook-suggestion')).toHaveTextContent(
			'and activate this one, or adjust the following URL path in either workflow:',
		);
		expect(wrapper.getByTestId('conflicting-webhook-path')).toHaveTextContent(
			'http://webhook-base/webhook-path',
		);
	});

	it('should render form conflict modal', async () => {
		const props = {
			modalName: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerName: 'Trigger in this workflow',
				workflowName: 'Test Form',
				triggerType: FORM_TRIGGER_NODE_TYPE,
				workflowId: '123',
				webhookPath: 'form-path',
				method: 'GET',
				node: 'Node in workflow',
			},
		};

		const wrapper = renderComponent({ props });
		await waitFor(() => {
			expect(wrapper.queryByTestId('conflicting-webhook-callout')).toBeInTheDocument();
		});

		expect(wrapper.getByTestId('conflicting-webhook-callout')).toHaveTextContent(
			"A form trigger 'Node in workflow' in the workflow 'Test Form' uses a conflicting URL path, so this workflow cannot be activated",
		);
		expect(wrapper.getByTestId('conflicting-webhook-suggestion')).toHaveTextContent(
			'and activate this one, or adjust the following URL path in either workflow:',
		);
		expect(wrapper.getByTestId('conflicting-webhook-path')).toHaveTextContent(
			'http://webhook-base/form-path',
		);
	});

	it('should render chat conflict modal', async () => {
		const props = {
			modalName: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerName: 'Chat in this workflow',
				workflowName: 'Test Chat',
				triggerType: CHAT_TRIGGER_NODE_TYPE,
				workflowId: '123',
				webhookPath: '123/chat',
				method: 'POST',
				node: 'Chat trigger',
			},
		};

		const wrapper = renderComponent({ props });
		await waitFor(() => {
			expect(wrapper.queryByTestId('conflicting-webhook-callout')).toBeInTheDocument();
		});

		expect(wrapper.getByTestId('conflicting-webhook-callout')).toHaveTextContent(
			"A chat trigger 'Chat trigger' in the workflow 'Test Chat' uses a conflicting URL path, so this workflow cannot be activated",
		);
		expect(wrapper.getByTestId('conflicting-webhook-suggestion')).toHaveTextContent(
			'and activate this one, or insert a new Chat Trigger node in either workflow:',
		);
		expect(wrapper.getByTestId('conflicting-webhook-path')).toHaveTextContent(
			'http://webhook-base/123/chat',
		);
	});

	it('should render trigger conflict modal', async () => {
		const props = {
			modalName: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerName: 'Slack in this workflow',
				workflowName: 'Test Trigger',
				triggerType: SLACK_TRIGGER_NODE_TYPE,
				workflowId: '123',
				webhookPath: '123/webhook',
				method: 'POST',
				node: 'Slack trigger',
			},
		};

		const wrapper = renderComponent({ props });
		await waitFor(() => {
			expect(wrapper.queryByTestId('conflicting-webhook-callout')).toBeInTheDocument();
		});

		expect(wrapper.getByTestId('conflicting-webhook-callout')).toHaveTextContent(
			"A trigger 'Slack trigger' in the workflow 'Test Trigger' uses a conflicting URL path, so this workflow cannot be activated",
		);
		expect(wrapper.getByTestId('conflicting-webhook-suggestion')).toHaveTextContent(
			'and activate this one, or insert a new trigger node of the same type in either workflow:',
		);
		expect(wrapper.getByTestId('conflicting-webhook-path')).toHaveTextContent(
			'http://webhook-base/123/webhook',
		);
	});
});
