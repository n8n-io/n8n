import { ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useActivationError } from './useActivationError';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';

const mocks = vi.hoisted(() => ({
	baseText: vi.fn((_key: string, _opts?: unknown) => 'translated'),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: mocks.baseText,
	}),
}));

const TEST_WF_ID = 'test-wf-id';

describe('useActivationError', () => {
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		useWorkflowsStore().workflow.id = TEST_WF_ID;
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
	});

	it('should return undefined when nodeId is undefined', () => {
		const { errorMessage } = useActivationError(undefined);
		expect(errorMessage.value).toBeUndefined();
	});

	it('should return undefined when node is not found', () => {
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(undefined);

		const { errorMessage } = useActivationError('missing-id');
		expect(errorMessage.value).toBeUndefined();
	});

	it('should return formatted message when node exists', () => {
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue({
			name: 'My HTTP Node',
		} as never);
		mocks.baseText.mockReturnValue('Error in node "My HTTP Node"');

		const { errorMessage } = useActivationError('node-123');

		expect(errorMessage.value).toBe('Error in node "My HTTP Node"');
		expect(mocks.baseText).toHaveBeenCalledWith('workflowActivator.showError.nodeError', {
			interpolate: { nodeName: 'My HTTP Node' },
		});
	});

	it('should react to ref changes', () => {
		const nodeIdRef = ref<string | undefined>(undefined);
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockImplementation((id: string) => {
			if (id === 'node-456') {
				return { name: 'Webhook' } as never;
			}
			return undefined;
		});

		const { errorMessage } = useActivationError(nodeIdRef);

		expect(errorMessage.value).toBeUndefined();

		mocks.baseText.mockReturnValue('Error in node "Webhook"');
		nodeIdRef.value = 'node-456';

		expect(errorMessage.value).toBe('Error in node "Webhook"');
	});

	it('should accept a getter as nodeId', () => {
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue({
			name: 'Slack',
		} as never);
		mocks.baseText.mockReturnValue('Error in node "Slack"');

		const { errorMessage } = useActivationError(() => 'node-789');

		expect(errorMessage.value).toBe('Error in node "Slack"');
	});
});
