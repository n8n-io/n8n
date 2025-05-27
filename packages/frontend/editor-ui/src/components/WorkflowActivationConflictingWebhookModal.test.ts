import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowActivationConflictingWebhookModal from '@/components/WorkflowActivationConflictingWebhookModal.vue';
import { WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY } from '@/constants';

import { waitFor } from '@testing-library/vue';

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

	it('should render modal', async () => {
		const props = {
			modalName: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerName: 'Trigger in this workflow',
				workflowName: 'Test Workflow',
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
		expect(wrapper.getByTestId('conflicting-webhook-path')).toHaveTextContent(
			'http://webhook-base/webhook-path',
		);
	});
});
