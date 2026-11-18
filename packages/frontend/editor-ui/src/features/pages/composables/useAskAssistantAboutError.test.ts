import type { PageSummary } from '@n8n/api-types';
import { ref } from 'vue';

import {
	MAX_ERROR_DESCRIPTION_LENGTH,
	MAX_ERROR_MESSAGE_LENGTH,
	useAskAssistantAboutError,
	type FailedNodeRun,
} from './useAskAssistantAboutError';

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

const toSummary = (id: string, title: string): PageSummary => ({
	id,
	title,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-01T00:00:00.000Z',
});

const failure: FailedNodeRun = {
	workflowId: 'w1',
	workflowName: 'Sync orders to CRM',
	nodeName: 'Fetch new orders',
	errorMessage: 'The resource you are requesting could not be found',
	errorDescription: '404 - Not Found',
	executionId: '42',
};

const pages = [toSummary('page-1', 'Orders runbook'), toSummary('page-2', 'Daily sales report')];

const sentRequest = () => String(mocks.startThread.mock.calls[0][1]);

describe('useAskAssistantAboutError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isAssistantAvailable = ref(true);
		mocks.isPageModuleActive = ref(true);
		mocks.startThread.mockResolvedValue('started');
	});

	describe('isAvailable', () => {
		it('should be true when the assistant is available and the page module is active', () => {
			expect(useAskAssistantAboutError().isAvailable.value).toBe(true);
		});

		it('should be false when the assistant is not available', () => {
			mocks.isAssistantAvailable.value = false;

			expect(useAskAssistantAboutError().isAvailable.value).toBe(false);
		});

		it('should be false when the page module is not active', () => {
			mocks.isPageModuleActive.value = false;

			expect(useAskAssistantAboutError().isAvailable.value).toBe(false);
		});
	});

	describe('askAboutError', () => {
		it('should send the failure, the page links and the instructions, with the workflow attached', async () => {
			await useAskAssistantAboutError().askAboutError(failure, pages, 'p1');

			expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
				'p1',
				[
					'The node "Fetch new orders" failed in the workflow "Sync orders to CRM" (workflow id: w1).',
					'Execution id: 42',
					'Error: The resource you are requesting could not be found',
					'Details: 404 - Not Found',
					'',
					'Runbook pages:',
					'- [Orders runbook](/page/page-1)',
					'- [Daily sales report](/page/page-2)',
					'',
					'Read the runbook pages first. Then tell me the cause of the failure and how to fix it. Cite each runbook page that you use as a link.',
				].join('\n'),
				{ kind: 'prefill', prefillType: 'handoff_execution_error' },
				{ source: 'node_error_view', origin: 'internal', sourceContext: { workflowId: 'w1' } },
				[{ type: 'workflow', id: 'w1', name: 'Sync orders to CRM' }],
			);
		});

		it('should leave the execution out when it is not known', async () => {
			await useAskAssistantAboutError().askAboutError(
				{ ...failure, executionId: undefined },
				pages,
				'p1',
			);

			expect(sentRequest()).not.toContain('Execution id');
		});

		it('should leave out a description that is missing or too long', async () => {
			const longDescription = 'x'.repeat(MAX_ERROR_DESCRIPTION_LENGTH + 1);

			await useAskAssistantAboutError().askAboutError(
				{ ...failure, errorDescription: longDescription },
				pages,
				'p1',
			);

			expect(sentRequest()).not.toContain('Details:');
		});

		it('should keep a description of the longest allowed length', async () => {
			const description = 'x'.repeat(MAX_ERROR_DESCRIPTION_LENGTH);

			await useAskAssistantAboutError().askAboutError(
				{ ...failure, errorDescription: description },
				pages,
				'p1',
			);

			expect(sentRequest()).toContain(`Details: ${description}`);
		});

		it('should cut an error message that is too long', async () => {
			const longMessage = 'm'.repeat(MAX_ERROR_MESSAGE_LENGTH + 50);

			await useAskAssistantAboutError().askAboutError(
				{ ...failure, errorMessage: longMessage },
				pages,
				'p1',
			);

			expect(sentRequest()).toContain(`Error: ${'m'.repeat(MAX_ERROR_MESSAGE_LENGTH)}…\n`);
			expect(sentRequest()).not.toContain('m'.repeat(MAX_ERROR_MESSAGE_LENGTH + 1));
		});

		it('should resolve with true when the thread opened', async () => {
			expect(await useAskAssistantAboutError().askAboutError(failure, pages, 'p1')).toBe(true);
		});

		it.each(['setup', 'busy', 'failed'])(
			'should resolve with false when the hand-off ends with %s',
			async (outcome) => {
				mocks.startThread.mockResolvedValue(outcome);

				expect(await useAskAssistantAboutError().askAboutError(failure, pages, 'p1')).toBe(false);
			},
		);

		it('should report the start while the hand-off runs, and clear it after a failure', async () => {
			let rejectStart: (error: Error) => void = () => {};
			mocks.startThread.mockReturnValue(
				new Promise((_resolve, reject) => {
					rejectStart = reject;
				}),
			);
			const { isStarting, askAboutError } = useAskAssistantAboutError();

			const pending = askAboutError(failure, pages, 'p1');
			expect(isStarting.value).toBe(true);

			rejectStart(new Error('network'));
			await expect(pending).rejects.toThrow('network');
			expect(isStarting.value).toBe(false);
		});
	});
});
