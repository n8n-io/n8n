import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shallowRef } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { usePostMessageHandler } from './usePostMessageHandler';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

const mockImportWorkflowExact = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/app/composables/useWorkflowImport', () => ({
	useWorkflowImport: vi.fn(() => ({
		importWorkflowExact: mockImportWorkflowExact,
	})),
}));

const mockResetWorkspace = vi.hoisted(() => vi.fn());
const mockOpenExecution = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockFitView = vi.hoisted(() => vi.fn());
vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn(() => ({
		resetWorkspace: mockResetWorkspace,
		openExecution: mockOpenExecution,
		fitView: mockFitView,
	})),
}));

const mockIsProductionExecutionPreview = vi.hoisted(() => ({ value: false }));
vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		isProductionExecutionPreview: mockIsProductionExecutionPreview,
		updateNodesInputIssues: vi.fn(),
		updateNodesCredentialsIssues: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn().mockResolvedValue(undefined),
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

const mockCanvasEventBusEmit = vi.hoisted(() => vi.fn());
vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: mockCanvasEventBusEmit,
	},
}));

const mockBuildExecutionResponseFromSchema = vi.hoisted(() =>
	vi.fn().mockReturnValue({ workflowData: { id: 'w1' } } as unknown as IExecutionResponse),
);
vi.mock('@/features/execution/executions/executions.utils', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		buildExecutionResponseFromSchema: mockBuildExecutionResponseFromSchema,
	};
});

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: vi.fn(() => ({ name: 'workflow' })),
	};
});

function createMockWorkflowState(): WorkflowState {
	return {
		setWorkflowExecutionData: vi.fn(),
	} as unknown as WorkflowState;
}

describe('usePostMessageHandler', () => {
	let workflowState: WorkflowState;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		mockIsProductionExecutionPreview.value = false;
		workflowState = createMockWorkflowState();
	});

	afterEach(() => {
		// Ensure listeners are cleaned up
	});

	describe('setup and cleanup', () => {
		it('should add message event listener on setup', () => {
			const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
			const { setup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});

			setup();

			expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('should remove message event listener on cleanup', () => {
			const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});

			setup();
			cleanup();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('should emit n8nReady postMessage on setup', () => {
			const postMessageSpy = vi.spyOn(window.parent, 'postMessage');
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});

			setup();

			expect(postMessageSpy).toHaveBeenCalledWith(
				expect.stringContaining('"command":"n8nReady"'),
				'*',
			);

			cleanup();
		});
	});

	describe('openWorkflow command', () => {
		it('should call importWorkflowExact when openWorkflow message is received', async () => {
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const workflow = { nodes: [], connections: {} };
			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({ command: 'openWorkflow', workflow }),
			});
			window.dispatchEvent(messageEvent);

			// Wait for async handler
			await vi.waitFor(() => {
				expect(mockImportWorkflowExact).toHaveBeenCalledWith(expect.objectContaining({ workflow }));
			});

			cleanup();
		});

		it('should emit tidyUp event when tidyUp is true', async () => {
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({
					command: 'openWorkflow',
					workflow: { nodes: [], connections: {} },
					tidyUp: true,
				}),
			});
			window.dispatchEvent(messageEvent);

			await vi.waitFor(() => {
				expect(mockCanvasEventBusEmit).toHaveBeenCalledWith('tidyUp', {
					source: 'import-workflow-data',
				});
			});

			cleanup();
		});
	});

	describe('openExecution command', () => {
		it('should set isProductionExecutionPreview for non-manual executions', async () => {
			mockOpenExecution.mockResolvedValue({
				workflowData: { id: 'w1', name: 'Test' },
				mode: 'trigger',
				finished: true,
			});

			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({
					command: 'openExecution',
					executionId: 'exec-1',
					executionMode: 'trigger',
				}),
			});
			window.dispatchEvent(messageEvent);

			await vi.waitFor(() => {
				expect(mockIsProductionExecutionPreview.value).toBe(true);
			});

			cleanup();
		});

		it('should not set isProductionExecutionPreview for manual executions', async () => {
			mockOpenExecution.mockResolvedValue({
				workflowData: { id: 'w1', name: 'Test' },
				mode: 'manual',
				finished: true,
			});

			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({
					command: 'openExecution',
					executionId: 'exec-1',
					executionMode: 'manual',
				}),
			});
			window.dispatchEvent(messageEvent);

			await vi.waitFor(() => {
				expect(mockOpenExecution).toHaveBeenCalled();
			});

			expect(mockIsProductionExecutionPreview.value).toBe(false);

			cleanup();
		});
	});

	describe('openExecutionPreview command', () => {
		it('should call importWorkflowExact and set execution data', async () => {
			const mockSetPinData = vi.fn();
			const storeRef = shallowRef({ setPinData: mockSetPinData } as never);
			const mockExecutionData = {
				workflowData: { id: 'w1' },
			} as unknown as IExecutionResponse;
			mockBuildExecutionResponseFromSchema.mockReturnValue(mockExecutionData);

			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: storeRef,
			});
			setup();

			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({
					command: 'openExecutionPreview',
					workflow: { nodes: [{ name: 'Node1' }], connections: {} },
					nodeExecutionSchema: {},
					executionStatus: 'success',
				}),
			});
			window.dispatchEvent(messageEvent);

			await vi.waitFor(() => {
				expect(mockImportWorkflowExact).toHaveBeenCalled();
			});

			expect(workflowState.setWorkflowExecutionData).toHaveBeenCalledWith(mockExecutionData);
			expect(mockSetPinData).toHaveBeenCalledWith({});

			cleanup();
		});

		it('should throw if workflow has no nodes', async () => {
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({
					command: 'openExecutionPreview',
					workflow: { connections: {} },
					nodeExecutionSchema: {},
					executionStatus: 'success',
				}),
			});
			window.dispatchEvent(messageEvent);

			// The error is caught internally, so we check that importWorkflowExact was not called
			await vi.waitFor(() => {
				expect(mockImportWorkflowExact).not.toHaveBeenCalled();
			});

			cleanup();
		});
	});

	describe('message filtering', () => {
		it('should ignore non-string messages', async () => {
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const messageEvent = new MessageEvent('message', { data: 123 });
			window.dispatchEvent(messageEvent);

			// Give async handlers time to run
			await new Promise((r) => setTimeout(r, 10));
			expect(mockImportWorkflowExact).not.toHaveBeenCalled();

			cleanup();
		});

		it('should ignore messages without "command" in data', async () => {
			const { setup, cleanup } = usePostMessageHandler({
				workflowState,
				currentWorkflowDocumentStore: shallowRef(null),
			});
			setup();

			const messageEvent = new MessageEvent('message', {
				data: JSON.stringify({ action: 'something' }),
			});
			window.dispatchEvent(messageEvent);

			await new Promise((r) => setTimeout(r, 10));
			expect(mockImportWorkflowExact).not.toHaveBeenCalled();

			cleanup();
		});
	});
});
