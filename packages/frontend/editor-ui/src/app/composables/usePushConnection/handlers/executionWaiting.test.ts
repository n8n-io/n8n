import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';
import { executionWaiting } from './executionWaiting';
import { nodeExecuteAfter } from './nodeExecuteAfter';
import type { PushHandlerOptions } from './types';

vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: () => ({ onNodeExecution: vi.fn() }),
}));

vi.mock('@/features/execution/executions/executions.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/execution/executions/executions.utils')>()),
	openFormPopupWindow: vi.fn(),
}));

vi.mock('./trackNodeExecution', () => ({ trackNodeExecution: vi.fn() }));

describe('executionWaiting', () => {
	const formUrl = 'http://localhost:5678/form-waiting/exec-1?signature=abc123';
	let options: PushHandlerOptions;
	let executionState: ReturnType<typeof useWorkflowExecutionStateStore>;

	function waitingNodeEvent(
		executionId = 'exec-1',
		resumeFormUrl: string | undefined = formUrl,
	): NodeExecuteAfter {
		return {
			type: 'nodeExecuteAfter',
			data: {
				executionId,
				nodeName: 'Wait',
				sequenceNumber: 1,
				itemCountByConnectionType: {},
				data: {
					executionTime: 0,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
					executionStatus: 'waiting',
					metadata: { resumeFormUrl },
				},
			},
		};
	}

	function notifyWaiting(executionId = 'exec-1') {
		executionWaiting({ type: 'executionWaiting', data: { executionId } }, options);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		options = { documentId: createWorkflowDocumentId('test-wf'), router: mock<Router>() };
		executionState = useWorkflowExecutionStateStore(options.documentId);
		executionState.setActiveExecutionId('exec-1');
	});

	it('opens the signed form URL only after the matching execution waits', async () => {
		await nodeExecuteAfter(waitingNodeEvent(), options);
		expect(openFormPopupWindow).not.toHaveBeenCalled();

		notifyWaiting('other-exec');
		expect(openFormPopupWindow).not.toHaveBeenCalled();
		expect(executionState.pendingFormPopupUrl).toBe(formUrl);

		notifyWaiting();
		expect(openFormPopupWindow).toHaveBeenCalledExactlyOnceWith(formUrl);
		expect(executionState.pendingFormPopupUrl).toBeUndefined();

		notifyWaiting();
		expect(openFormPopupWindow).toHaveBeenCalledTimes(1);
	});

	it('ignores form URLs from another execution', async () => {
		await nodeExecuteAfter(waitingNodeEvent('other-exec'), options);
		notifyWaiting();
		expect(openFormPopupWindow).not.toHaveBeenCalled();
	});

	it('does not open a popup without a pending form URL', () => {
		notifyWaiting();
		expect(openFormPopupWindow).not.toHaveBeenCalled();
	});

	it('does not reuse a form URL when the next node waits without a form', async () => {
		await nodeExecuteAfter(waitingNodeEvent(), options);
		notifyWaiting();
		vi.mocked(openFormPopupWindow).mockClear();

		const event = waitingNodeEvent();
		delete event.data.data.metadata;
		await nodeExecuteAfter(event, options);
		notifyWaiting();
		expect(openFormPopupWindow).not.toHaveBeenCalled();
	});

	it('does not queue a form URL from a completed node', async () => {
		const event = waitingNodeEvent();
		event.data.data.executionStatus = 'success';
		await nodeExecuteAfter(event, options);
		notifyWaiting();
		expect(openFormPopupWindow).not.toHaveBeenCalled();
	});

	it('keeps pending form URLs isolated by document', async () => {
		await nodeExecuteAfter(waitingNodeEvent(), options);
		executionWaiting(
			{ type: 'executionWaiting', data: { executionId: 'exec-1' } },
			{ ...options, documentId: createWorkflowDocumentId('other-wf') },
		);
		expect(openFormPopupWindow).not.toHaveBeenCalled();

		notifyWaiting();
		expect(openFormPopupWindow).toHaveBeenCalledExactlyOnceWith(formUrl);
	});

	it.each(['new execution', 'stop', 'reset'] as const)(
		'clears the pending form URL on %s',
		async (action) => {
			await nodeExecuteAfter(waitingNodeEvent(), options);
			if (action === 'new execution') executionState.setActiveExecutionId('exec-2');
			if (action === 'stop') executionState.markExecutionAsStopped();
			if (action === 'reset') executionState.resetExecutionState();

			expect(executionState.pendingFormPopupUrl).toBeUndefined();
			notifyWaiting();
			if (action === 'new execution') notifyWaiting('exec-2');
			expect(openFormPopupWindow).not.toHaveBeenCalled();
		},
	);

	it('retains the pending URL when the active execution id stays the same', async () => {
		await nodeExecuteAfter(waitingNodeEvent(), options);
		executionState.setActiveExecutionId('exec-1');
		notifyWaiting();
		expect(openFormPopupWindow).toHaveBeenCalledExactlyOnceWith(formUrl);
	});

	it('uses a fresh signed URL for the next wait in the same execution', async () => {
		await nodeExecuteAfter(waitingNodeEvent(), options);
		notifyWaiting();

		const nextUrl = `${formUrl}&webhookSuffix=next-form`;
		await nodeExecuteAfter(waitingNodeEvent('exec-1', nextUrl), options);
		expect(openFormPopupWindow).toHaveBeenCalledTimes(1);
		notifyWaiting();
		expect(openFormPopupWindow).toHaveBeenLastCalledWith(nextUrl);
		expect(openFormPopupWindow).toHaveBeenCalledTimes(2);
	});
});
