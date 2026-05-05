/**
 * Tests for workflowExecutionState.store.
 *
 * Verifies the keyed-by-workflowId state store: tri-state activeExecutionId,
 * pendingExecution fallback, promotePendingExecution lifecycle, current
 * executions filter+dedupe, last-successful-execution via id reference,
 * dispose lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import {
	useWorkflowExecutionStateStore,
	createWorkflowExecutionStateId,
	getWorkflowExecutionStateStoreId,
	disposeWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { useExecutionDataStore, createExecutionDataId } from '@/app/stores/executionData.store';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { ExecutionSummary } from 'n8n-workflow';

function makeExecution(overrides: Partial<IExecutionResponse> = {}): IExecutionResponse {
	return createTestWorkflowExecutionResponse({
		id: 'exec-1',
		finished: false,
		status: 'running',
		...overrides,
	});
}

function makeExecutionSummary(overrides: Partial<ExecutionSummary> = {}): ExecutionSummary {
	return {
		id: '1',
		workflowId: 'wf-1',
		mode: 'manual',
		status: 'success',
		createdAt: new Date(),
		startedAt: new Date(),
		...overrides,
	} as ExecutionSummary;
}

describe('workflowExecutionState.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('store identity', () => {
		it('uses a workflowId-scoped store id', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-42'));
			expect(stateStore.$id).toBe(getWorkflowExecutionStateStoreId('wf-42'));
			expect(stateStore.workflowId).toBe('wf-42');
		});

		it('different workflowIds produce isolated state stores', () => {
			const a = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-a'));
			const b = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-b'));

			a.setExecutionWaitingForWebhook(true);
			b.setIsInDebugMode(true);

			expect(a.executionWaitingForWebhook).toBe(true);
			expect(a.isInDebugMode).toBe(false);
			expect(b.executionWaitingForWebhook).toBe(false);
			expect(b.isInDebugMode).toBe(true);
		});
	});

	describe('activeExecutionId tri-state', () => {
		it('starts undefined', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			expect(stateStore.activeExecutionId).toBeUndefined();
		});

		it('null indicates execution started but id pending', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId(null);
			expect(stateStore.activeExecutionId).toBeNull();
		});

		it('string indicates known execution id', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId('exec-1');
			expect(stateStore.activeExecutionId).toBe('exec-1');
		});

		it('rolls activeExecutionId into previousExecutionId on transition to a new id', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId('exec-1');
			stateStore.setActiveExecutionId('exec-2');
			expect(stateStore.previousExecutionId).toBe('exec-1');
			expect(stateStore.activeExecutionId).toBe('exec-2');
		});

		it('does not update previousExecutionId when clearing to undefined', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId('exec-1');
			stateStore.setActiveExecutionId(undefined);
			expect(stateStore.previousExecutionId).toBeUndefined();
			expect(stateStore.activeExecutionId).toBeUndefined();
		});

		it('setting a string id also sets displayedExecutionId', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId('exec-1');
			expect(stateStore.displayedExecutionId).toBe('exec-1');
		});

		it('clearing activeExecutionId preserves displayedExecutionId', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId('exec-1');
			stateStore.setActiveExecutionId(undefined);
			expect(stateStore.displayedExecutionId).toBe('exec-1');
		});
	});

	describe('activeExecution routing', () => {
		it('returns pendingExecution when activeExecutionId === null', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const scaffold = makeExecution({ id: '__IN_PROGRESS__' });
			stateStore.setPendingExecution(scaffold);
			stateStore.setActiveExecutionId(null);

			expect(stateStore.activeExecution?.id).toBe('__IN_PROGRESS__');
		});

		it('returns the executionData store entry when activeExecutionId is a string', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			dataStore.setExecution(makeExecution({ id: 'exec-1' }));

			stateStore.setActiveExecutionId('exec-1');

			expect(stateStore.activeExecution?.id).toBe('exec-1');
		});

		it('falls back to displayed execution after active is cleared', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			dataStore.setExecution(makeExecution({ id: 'exec-1' }));

			stateStore.setActiveExecutionId('exec-1');
			stateStore.setActiveExecutionId(undefined);

			expect(stateStore.activeExecution?.id).toBe('exec-1');
		});

		it('returns null when nothing is set', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			expect(stateStore.activeExecution).toBeNull();
		});
	});

	describe('promotePendingExecution', () => {
		it('migrates the pending scaffold into a fresh executionData store and sets activeExecutionId', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				data: {
					resultData: { runData: { Trigger: [{ executionStatus: 'success' } as never] } },
				} as never,
			});
			stateStore.setPendingExecution(scaffold);
			stateStore.setActiveExecutionId(null);

			stateStore.promotePendingExecution('exec-real');

			expect(stateStore.activeExecutionId).toBe('exec-real');
			expect(stateStore.pendingExecution).toBeNull();

			const dataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(dataStore.execution?.id).toBe('exec-real');
			expect(dataStore.execution?.data?.resultData.runData.Trigger).toBeDefined();
		});

		it('still sets activeExecutionId when no pending scaffold exists', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));

			stateStore.promotePendingExecution('exec-real');

			expect(stateStore.activeExecutionId).toBe('exec-real');
			expect(stateStore.pendingExecution).toBeNull();
		});
	});

	describe('isWorkflowRunning', () => {
		it('is true when activeExecutionId is null (pending)', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId(null);
			expect(stateStore.isWorkflowRunning).toBe(true);
		});

		it('is true when active execution is running and not finished', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'running', finished: false }),
			);
			stateStore.setActiveExecutionId('exec-1');
			expect(stateStore.isWorkflowRunning).toBe(true);
		});

		it('is false when active execution is finished', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'success', finished: true }),
			);
			stateStore.setActiveExecutionId('exec-1');
			expect(stateStore.isWorkflowRunning).toBe(false);
		});

		it('is false when no active execution is tracked', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			expect(stateStore.isWorkflowRunning).toBe(false);
		});
	});

	describe('currentWorkflowExecutions', () => {
		it('addToCurrentExecutions filters by workflowId', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'other-wf' }),
			]);

			expect(stateStore.currentWorkflowExecutions).toHaveLength(1);
			expect(stateStore.currentWorkflowExecutions[0].id).toBe('1');
		});

		it('addToCurrentExecutions deduplicates by id', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.addToCurrentExecutions([makeExecutionSummary({ id: '1', workflowId: 'wf-1' })]);
			stateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'wf-1' }),
			]);

			expect(stateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['1', '2']);
		});

		it('deleteExecution accepts both summary and id', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const a = makeExecutionSummary({ id: '1', workflowId: 'wf-1' });
			const b = makeExecutionSummary({ id: '2', workflowId: 'wf-1' });
			stateStore.setCurrentWorkflowExecutions([a, b]);

			stateStore.deleteExecution(a);
			expect(stateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['2']);

			stateStore.deleteExecution('2');
			expect(stateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('clearCurrentWorkflowExecutions empties the list', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			stateStore.clearCurrentWorkflowExecutions();
			expect(stateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('getAllLoadedFinishedExecutions filters by finished or stoppedAt', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setCurrentWorkflowExecutions([
				makeExecutionSummary({ id: '1', finished: true }),
				makeExecutionSummary({ id: '2', finished: false }),
				makeExecutionSummary({ id: '3', finished: false, stoppedAt: new Date() }),
			]);

			expect(stateStore.getAllLoadedFinishedExecutions.map((e) => e.id).sort()).toEqual(['1', '3']);
		});
	});

	describe('lastSuccessfulExecution', () => {
		it('stores execution as id reference and resolves through executionData store', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const exec = makeExecution({ id: 'last-1', status: 'success', finished: true });

			stateStore.setLastSuccessfulExecution(exec);

			expect(stateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(stateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('is independent of active/displayed execution', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			useExecutionDataStore(createExecutionDataId('active-1')).setExecution(
				makeExecution({ id: 'active-1' }),
			);
			stateStore.setActiveExecutionId('active-1');
			stateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));

			expect(stateStore.activeExecutionId).toBe('active-1');
			expect(stateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(stateStore.activeExecution?.id).toBe('active-1');
			expect(stateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('disposes the previous executionData store entry on replacement', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			const pinia = getActivePinia();
			const previousStoreId = useExecutionDataStore(createExecutionDataId('last-1')).$id;

			stateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-2' }));

			expect(pinia?.state.value[previousStoreId]).toBeUndefined();
			expect(stateStore.lastSuccessfulExecution?.id).toBe('last-2');
		});

		it('clears via null', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			stateStore.setLastSuccessfulExecution(null);
			expect(stateStore.lastSuccessfulExecutionId).toBeNull();
			expect(stateStore.lastSuccessfulExecution).toBeNull();
		});
	});

	describe('chat + trigger + flags', () => {
		it('appendChatMessage / resetChatMessages round-trip', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.appendChatMessage('hello');
			stateStore.appendChatMessage('world');
			expect(stateStore.chatMessages).toEqual(['hello', 'world']);
			expect(stateStore.getPastChatMessages).toEqual(['hello', 'world']);
			stateStore.resetChatMessages();
			expect(stateStore.chatMessages).toEqual([]);
		});

		it('setSelectedTriggerNodeName updates the value', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setSelectedTriggerNodeName('TriggerA');
			expect(stateStore.selectedTriggerNodeName).toBe('TriggerA');
			stateStore.setSelectedTriggerNodeName(undefined);
			expect(stateStore.selectedTriggerNodeName).toBeUndefined();
		});

		it('setExecutionWaitingForWebhook / setIsInDebugMode toggle flags', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setExecutionWaitingForWebhook(true);
			stateStore.setIsInDebugMode(true);
			expect(stateStore.executionWaitingForWebhook).toBe(true);
			expect(stateStore.isInDebugMode).toBe(true);
		});

		it('setChatPartialExecutionDestinationNode round-trip', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setChatPartialExecutionDestinationNode('NodeA');
			expect(stateStore.chatPartialExecutionDestinationNode).toBe('NodeA');
			stateStore.setChatPartialExecutionDestinationNode(null);
			expect(stateStore.chatPartialExecutionDestinationNode).toBeNull();
		});
	});

	describe('renameExecutionStateNode', () => {
		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setSelectedTriggerNodeName('Old');
			stateStore.setChatPartialExecutionDestinationNode('Old');

			stateStore.renameExecutionStateNode('Old', 'New');

			expect(stateStore.selectedTriggerNodeName).toBe('New');
			expect(stateStore.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('does nothing when names do not match', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setSelectedTriggerNodeName('A');
			stateStore.setChatPartialExecutionDestinationNode('B');

			stateStore.renameExecutionStateNode('Other', 'Renamed');

			expect(stateStore.selectedTriggerNodeName).toBe('A');
			expect(stateStore.chatPartialExecutionDestinationNode).toBe('B');
		});
	});

	describe('resolveExecutionTriggerNodeName', () => {
		it('returns triggerNode from active execution', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					triggerNode: 'TriggerA',
					status: 'running',
					finished: false,
				}),
			);
			stateStore.setActiveExecutionId('exec-1');

			expect(stateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe('TriggerA');
		});

		it('falls back to runData keys for partial executions', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					status: 'running',
					finished: false,
					data: { resultData: { runData: { TriggerB: [] } } } as never,
				}),
			);
			stateStore.setActiveExecutionId('exec-1');

			expect(stateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe('TriggerB');
		});

		it('returns undefined when not running', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			expect(stateStore.resolveExecutionTriggerNodeName(['TriggerA'])).toBeUndefined();
		});
	});

	describe('resetExecutionState', () => {
		it('clears every state field', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setActiveExecutionId('exec-1');
			stateStore.setPendingExecution(makeExecution());
			stateStore.setExecutionWaitingForWebhook(true);
			stateStore.setIsInDebugMode(true);
			stateStore.appendChatMessage('hi');
			stateStore.setChatPartialExecutionDestinationNode('Node');
			stateStore.setSelectedTriggerNodeName('Trigger');
			stateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			stateStore.setLastSuccessfulExecutionId('last-1');

			stateStore.resetExecutionState();

			expect(stateStore.activeExecutionId).toBeUndefined();
			expect(stateStore.displayedExecutionId).toBeUndefined();
			expect(stateStore.previousExecutionId).toBeUndefined();
			expect(stateStore.pendingExecution).toBeNull();
			expect(stateStore.executionWaitingForWebhook).toBe(false);
			expect(stateStore.isInDebugMode).toBe(false);
			expect(stateStore.chatMessages).toEqual([]);
			expect(stateStore.chatPartialExecutionDestinationNode).toBeNull();
			expect(stateStore.selectedTriggerNodeName).toBeUndefined();
			expect(stateStore.currentWorkflowExecutions).toEqual([]);
			expect(stateStore.lastSuccessfulExecutionId).toBeNull();
		});
	});

	describe('event hook', () => {
		it('fires onWorkflowExecutionStateChange with workflowId and field discriminator', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			const spy = vi.fn();
			stateStore.onWorkflowExecutionStateChange(spy);

			stateStore.setExecutionWaitingForWebhook(true);

			expect(spy).toHaveBeenCalled();
			expect(spy.mock.calls[0][0]).toMatchObject({
				action: 'update',
				payload: { workflowId: 'wf-1', field: 'executionWaitingForWebhook' },
			});
		});

		it('emits a delete action when clearing pending execution', () => {
			const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-1'));
			stateStore.setPendingExecution(makeExecution());

			const spy = vi.fn();
			stateStore.onWorkflowExecutionStateChange(spy);
			stateStore.setPendingExecution(null);

			expect(spy.mock.calls.some((c) => c[0].action === 'delete')).toBe(true);
		});
	});

	describe('disposeWorkflowExecutionStateStore', () => {
		it('removes pinia state and recreate yields fresh state', () => {
			const id = createWorkflowExecutionStateId('wf-disposable');
			const stateStore = useWorkflowExecutionStateStore(id);
			const pinia = getActivePinia();
			const disposeSpy = vi.spyOn(stateStore, '$dispose');

			stateStore.setExecutionWaitingForWebhook(true);
			expect(pinia?.state.value[stateStore.$id]).toBeDefined();

			disposeWorkflowExecutionStateStore(stateStore);

			expect(disposeSpy).toHaveBeenCalledOnce();
			expect(pinia?.state.value[stateStore.$id]).toBeUndefined();

			const recreated = useWorkflowExecutionStateStore(id);
			expect(recreated).not.toBe(stateStore);
			expect(recreated.executionWaitingForWebhook).toBe(false);
		});
	});
});
