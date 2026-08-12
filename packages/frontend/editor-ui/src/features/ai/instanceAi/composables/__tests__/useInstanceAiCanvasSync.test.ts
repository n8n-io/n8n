import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import { VIEWS } from '@/app/constants';
import type { InstanceAiChatMessage } from '@n8n/api-types';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

const { routeState, replace, emit, fetchExecutionDataById, toggleOpen } = vi.hoisted(() => ({
	routeState: {
		name: 'NodeViewExisting' as string,
		params: { workflowId: 'client-new-id' } as Record<string, string>,
		query: { new: 'true' } as Record<string, string>,
	},
	replace: vi.fn(),
	emit: vi.fn(),
	fetchExecutionDataById: vi.fn(),
	toggleOpen: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => routeState,
	useRouter: () => ({ replace }),
}));

vi.mock('@/app/event-bus/node-view', () => ({
	nodeViewEventBus: { emit },
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		fetchExecutionDataById,
	}),
}));

vi.mock('@/app/stores/logs.store', () => ({
	useLogsStore: () => ({
		toggleOpen,
	}),
}));

import { useInstanceAiCanvasSync } from '../useInstanceAiCanvasSync';
import type { ThreadRuntime } from '../../instanceAi.store';

function makeAgentMessage(
	toolCalls: Array<{
		toolCallId: string;
		toolName: string;
		args?: Record<string, unknown>;
		result?: Record<string, unknown>;
	}>,
): InstanceAiChatMessage {
	return {
		id: `msg-${toolCalls[0]?.toolCallId ?? 'x'}`,
		role: 'assistant',
		content: '',
		agentTree: {
			agentId: 'root',
			role: 'orchestrator',
			status: 'completed',
			children: [],
			toolCalls: toolCalls.map((tc) => ({
				toolCallId: tc.toolCallId,
				toolName: tc.toolName,
				args: tc.args ?? {},
				isLoading: false,
				result: tc.result ?? { success: true },
			})),
		},
	} as InstanceAiChatMessage;
}

describe('useInstanceAiCanvasSync', () => {
	let scope: EffectScope;
	const messages = ref<InstanceAiChatMessage[]>([]);
	const isHydratingThread = ref(false);

	function start() {
		scope = effectScope();
		scope.run(() =>
			useInstanceAiCanvasSync({
				get messages() {
					return messages.value;
				},
				get isHydratingThread() {
					return isHydratingThread.value;
				},
			} as ThreadRuntime),
		);
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		messages.value = [];
		isHydratingThread.value = false;
		routeState.name = VIEWS.WORKFLOW;
		routeState.params = { workflowId: 'client-new-id' };
		routeState.query = { new: 'true' };
		fetchExecutionDataById.mockResolvedValue(null);
	});

	afterEach(() => {
		scope?.stop();
	});

	it('navigates from a new canvas to the built workflow id', async () => {
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-1',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-real-1' },
				},
			]),
		];
		await nextTick();

		expect(replace).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-real-1' },
		});
		expect(emit).not.toHaveBeenCalled();
	});

	it('reloads when the open workflow is mutated', async () => {
		routeState.query = {};
		routeState.params = { workflowId: 'wf-1' };
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-update-1',
					toolName: 'workflows',
					args: { action: 'update', workflowId: 'wf-1' },
					result: { success: true },
				},
			]),
		];
		await nextTick();

		expect(emit).toHaveBeenCalledWith('reloadWorkflow', { workflowId: 'wf-1' });
		expect(replace).not.toHaveBeenCalled();
	});

	it('navigates when a different workflow is mutated while on the editor', async () => {
		routeState.query = {};
		routeState.params = { workflowId: 'wf-open' };
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-2',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-other' },
				},
			]),
		];
		await nextTick();

		expect(replace).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-other' },
		});
	});

	it('reloads after setup tools finish on the open workflow', async () => {
		routeState.query = {};
		routeState.params = { workflowId: 'wf-1' };
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-setup-1',
					toolName: 'setup-workflow',
					args: { workflowId: 'wf-1' },
					result: { success: true },
				},
			]),
		];
		await nextTick();

		expect(emit).toHaveBeenCalledWith('reloadWorkflow', { workflowId: 'wf-1' });
	});

	it('paints verify-built-workflow execution results on the open canvas', async () => {
		routeState.query = {};
		routeState.params = { workflowId: 'wf-1' };
		const execution = {
			id: 'exec-verify-1',
			workflowId: 'wf-1',
			status: 'success',
			finished: true,
			mode: 'manual',
			startedAt: new Date(),
			createdAt: new Date(),
			workflowData: { id: 'wf-1', name: 'Built', nodes: [], connections: {} },
			data: { resultData: { runData: {} } },
		};
		fetchExecutionDataById.mockResolvedValue(execution);
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-verify-1',
					toolName: 'verify-built-workflow',
					args: { workflowId: 'wf-1' },
					result: { executionId: 'exec-verify-1', status: 'success' },
				},
			]),
		];
		await nextTick();
		await Promise.resolve();
		await Promise.resolve();

		expect(fetchExecutionDataById).toHaveBeenCalledWith('exec-verify-1');
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
		expect(executionState.displayedExecutionId).toBe('exec-verify-1');
		expect(toggleOpen).toHaveBeenCalledWith(true);
	});

	it('does nothing while hydrating', async () => {
		isHydratingThread.value = true;
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-1',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-real-1' },
				},
			]),
		];
		await nextTick();

		expect(replace).not.toHaveBeenCalled();
		expect(emit).not.toHaveBeenCalled();
		expect(fetchExecutionDataById).not.toHaveBeenCalled();
	});

	it('does nothing off the workflow editor', async () => {
		routeState.name = VIEWS.HOMEPAGE;
		routeState.query = {};
		start();

		messages.value = [
			makeAgentMessage([
				{
					toolCallId: 'tc-1',
					toolName: 'build-workflow',
					result: { success: true, workflowId: 'wf-real-1' },
				},
			]),
		];
		await nextTick();

		expect(replace).not.toHaveBeenCalled();
		expect(emit).not.toHaveBeenCalled();
	});
});
