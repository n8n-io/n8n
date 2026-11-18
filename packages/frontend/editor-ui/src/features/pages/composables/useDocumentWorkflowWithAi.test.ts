import { ref } from 'vue';

import { useDocumentWorkflowWithAi } from './useDocumentWorkflowWithAi';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	isAssistantAvailable: undefined as unknown as { value: boolean },
	isPageModuleActive: undefined as unknown as { value: boolean },
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => mocks.isAssistantAvailable,
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ startThread: mocks.startThread }),
}));
vi.mock('./useIsPageModuleActive', () => ({
	useIsPageModuleActive: () => mocks.isPageModuleActive,
}));

const workflow = { id: 'w1', name: 'Invoice sync' };

describe('useDocumentWorkflowWithAi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isAssistantAvailable = ref(true);
		mocks.isPageModuleActive = ref(true);
		mocks.startThread.mockResolvedValue('started');
	});

	describe('isAvailable', () => {
		it('should be true when the assistant is available and the page module is active', () => {
			expect(useDocumentWorkflowWithAi().isAvailable.value).toBe(true);
		});

		it('should be false when the assistant is not available', () => {
			mocks.isAssistantAvailable.value = false;

			expect(useDocumentWorkflowWithAi().isAvailable.value).toBe(false);
		});

		it('should be false when the page module is not active', () => {
			mocks.isPageModuleActive.value = false;

			expect(useDocumentWorkflowWithAi().isAvailable.value).toBe(false);
		});
	});

	describe('documentWorkflow', () => {
		it('should send a documentation request with the workflow attached, in the project', async () => {
			await useDocumentWorkflowWithAi().documentWorkflow(workflow, 'p1');

			expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
				'p1',
				'Write a short page that documents the workflow "Invoice sync".',
				{ kind: 'prefill', prefillType: 'handoff_document_workflow' },
				{
					source: 'workflow_pages_button',
					origin: 'internal',
					sourceContext: { workflowId: 'w1' },
				},
				[{ type: 'workflow', id: 'w1', name: 'Invoice sync' }],
			);
		});

		it('should resolve with true when the thread opened', async () => {
			expect(await useDocumentWorkflowWithAi().documentWorkflow(workflow, 'p1')).toBe(true);
		});

		it.each(['setup', 'busy', 'failed'])(
			'should resolve with false when the hand-off ends with %s',
			async (outcome) => {
				mocks.startThread.mockResolvedValue(outcome);

				expect(await useDocumentWorkflowWithAi().documentWorkflow(workflow, 'p1')).toBe(false);
			},
		);

		it('should report the start while the hand-off runs, and clear it after a failure', async () => {
			let rejectStart: (error: Error) => void = () => {};
			mocks.startThread.mockReturnValue(
				new Promise((_resolve, reject) => {
					rejectStart = reject;
				}),
			);
			const { isStarting, documentWorkflow } = useDocumentWorkflowWithAi();

			const pending = documentWorkflow(workflow, 'p1');
			expect(isStarting.value).toBe(true);

			rejectStart(new Error('network'));
			await expect(pending).rejects.toThrow('network');
			expect(isStarting.value).toBe(false);
		});
	});
});
