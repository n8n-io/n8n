import { ref } from 'vue';
import { useActivationError } from './useActivationError';

const mocks = vi.hoisted(() => ({
	getNodeById: vi.fn(),
	baseText: vi.fn((_key: string, _opts?: unknown) => 'translated'),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		getNodeById: mocks.getNodeById,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: mocks.baseText,
	}),
}));

describe('useActivationError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return undefined when nodeId is undefined', () => {
		const { errorMessage } = useActivationError(undefined);
		expect(errorMessage.value).toBeUndefined();
		expect(mocks.getNodeById).not.toHaveBeenCalled();
	});

	it('should return undefined when node is not found', () => {
		mocks.getNodeById.mockReturnValue(undefined);

		const { errorMessage } = useActivationError('missing-id');
		expect(errorMessage.value).toBeUndefined();
		expect(mocks.getNodeById).toHaveBeenCalledWith('missing-id');
	});

	it('should return formatted message when node exists', () => {
		mocks.getNodeById.mockReturnValue({ name: 'My HTTP Node' });
		mocks.baseText.mockReturnValue('Error in node "My HTTP Node"');

		const { errorMessage } = useActivationError('node-123');

		expect(errorMessage.value).toBe('Error in node "My HTTP Node"');
		expect(mocks.getNodeById).toHaveBeenCalledWith('node-123');
		expect(mocks.baseText).toHaveBeenCalledWith('workflowActivator.showError.nodeError', {
			interpolate: { nodeName: 'My HTTP Node' },
		});
	});

	it('should react to ref changes', () => {
		const nodeIdRef = ref<string | undefined>(undefined);
		const { errorMessage } = useActivationError(nodeIdRef);

		expect(errorMessage.value).toBeUndefined();
		expect(mocks.getNodeById).not.toHaveBeenCalled();

		mocks.getNodeById.mockReturnValue({ name: 'Webhook' });
		mocks.baseText.mockReturnValue('Error in node "Webhook"');
		nodeIdRef.value = 'node-456';

		expect(errorMessage.value).toBe('Error in node "Webhook"');
		expect(mocks.getNodeById).toHaveBeenCalledWith('node-456');
	});

	it('should accept a getter as nodeId', () => {
		mocks.getNodeById.mockReturnValue({ name: 'Slack' });
		mocks.baseText.mockReturnValue('Error in node "Slack"');

		const { errorMessage } = useActivationError(() => 'node-789');

		expect(errorMessage.value).toBe('Error in node "Slack"');
		expect(mocks.getNodeById).toHaveBeenCalledWith('node-789');
	});
});
