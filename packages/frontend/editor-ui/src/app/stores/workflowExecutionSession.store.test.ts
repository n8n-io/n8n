/**
 * Tests for workflowExecutionSession.store.
 *
 * Verifies the keyed-by-workflowId session store: tri-state activeExecutionId,
 * pendingExecution fallback, promotePendingExecution lifecycle, current
 * executions filter+dedupe, last-successful-execution via id reference,
 * dispose lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import {
	useWorkflowExecutionSessionStore,
	createWorkflowExecutionSessionId,
	getWorkflowExecutionSessionStoreId,
	disposeWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import { useExecutionDataStore, createExecutionDataId } from '@/app/stores/executionData.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { ExecutionSummary } from 'n8n-workflow';

function makeExecution(overrides: Partial<IExecutionResponse> = {}): IExecutionResponse {
	return {
		id: 'exec-1',
		workflowId: 'wf-1',
		finished: false,
		mode: 'manual',
		status: 'running',
		createdAt: new Date(),
		startedAt: new Date(),
		workflowData: {} as never,
		data: { resultData: { runData: {} } },
		...overrides,
	} as IExecutionResponse;
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

describe('workflowExecutionSession.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('store identity', () => {
		it('uses a workflowId-scoped store id', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-42'));
			expect(session.$id).toBe(getWorkflowExecutionSessionStoreId('wf-42'));
			expect(session.workflowId).toBe('wf-42');
		});

		it('different workflowIds produce isolated session stores', () => {
			const a = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-a'));
			const b = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-b'));

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
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			expect(session.activeExecutionId).toBeUndefined();
		});

		it('null indicates execution started but id pending', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId(null);
			expect(session.activeExecutionId).toBeNull();
		});

		it('string indicates known execution id', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId('exec-1');
			expect(session.activeExecutionId).toBe('exec-1');
		});

		it('rolls activeExecutionId into previousExecutionId on transition to a new id', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId('exec-1');
			session.setActiveExecutionId('exec-2');
			expect(session.previousExecutionId).toBe('exec-1');
			expect(session.activeExecutionId).toBe('exec-2');
		});

		it('does not update previousExecutionId when clearing to undefined', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId('exec-1');
			session.setActiveExecutionId(undefined);
			expect(session.previousExecutionId).toBeUndefined();
			expect(session.activeExecutionId).toBeUndefined();
		});

		it('setting a string id also sets displayedExecutionId', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId('exec-1');
			expect(session.displayedExecutionId).toBe('exec-1');
		});

		it('clearing activeExecutionId preserves displayedExecutionId', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId('exec-1');
			session.setActiveExecutionId(undefined);
			expect(session.displayedExecutionId).toBe('exec-1');
		});
	});

	describe('activeExecution routing', () => {
		it('returns pendingExecution when activeExecutionId === null', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const scaffold = makeExecution({ id: '__IN_PROGRESS__' });
			session.setPendingExecution(scaffold);
			session.setActiveExecutionId(null);

			expect(session.activeExecution?.id).toBe('__IN_PROGRESS__');
		});

		it('returns the executionData store entry when activeExecutionId is a string', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			dataStore.setExecution(makeExecution({ id: 'exec-1' }));

			session.setActiveExecutionId('exec-1');

			expect(session.activeExecution?.id).toBe('exec-1');
		});

		it('falls back to displayed execution after active is cleared', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			dataStore.setExecution(makeExecution({ id: 'exec-1' }));

			session.setActiveExecutionId('exec-1');
			session.setActiveExecutionId(undefined);

			expect(session.activeExecution?.id).toBe('exec-1');
		});

		it('returns null when nothing is set', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			expect(session.activeExecution).toBeNull();
		});
	});

	describe('promotePendingExecution', () => {
		it('migrates the pending scaffold into a fresh executionData store and sets activeExecutionId', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				data: {
					resultData: { runData: { Trigger: [{ executionStatus: 'success' } as never] } },
				} as never,
			});
			session.setPendingExecution(scaffold);
			session.setActiveExecutionId(null);

			session.promotePendingExecution('exec-real');

			expect(session.activeExecutionId).toBe('exec-real');
			expect(session.pendingExecution).toBeNull();

			const dataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(dataStore.execution?.id).toBe('exec-real');
			expect(dataStore.execution?.data?.resultData.runData.Trigger).toBeDefined();
		});

		it('still sets activeExecutionId when no pending scaffold exists', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));

			session.promotePendingExecution('exec-real');

			expect(session.activeExecutionId).toBe('exec-real');
			expect(session.pendingExecution).toBeNull();
		});
	});

	describe('isWorkflowRunning', () => {
		it('is true when activeExecutionId is null (pending)', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId(null);
			expect(session.isWorkflowRunning).toBe(true);
		});

		it('is true when active execution is running and not finished', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'running', finished: false }),
			);
			session.setActiveExecutionId('exec-1');
			expect(session.isWorkflowRunning).toBe(true);
		});

		it('is false when active execution is finished', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'success', finished: true }),
			);
			session.setActiveExecutionId('exec-1');
			expect(session.isWorkflowRunning).toBe(false);
		});

		it('is false when no active execution is tracked', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			expect(session.isWorkflowRunning).toBe(false);
		});
	});

	describe('currentWorkflowExecutions', () => {
		it('addToCurrentExecutions filters by workflowId', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'other-wf' }),
			]);

			expect(session.currentWorkflowExecutions).toHaveLength(1);
			expect(session.currentWorkflowExecutions[0].id).toBe('1');
		});

		it('addToCurrentExecutions deduplicates by id', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.addToCurrentExecutions([makeExecutionSummary({ id: '1', workflowId: 'wf-1' })]);
			session.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'wf-1' }),
			]);

			expect(session.currentWorkflowExecutions.map((e) => e.id)).toEqual(['1', '2']);
		});

		it('deleteExecution accepts both summary and id', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const a = makeExecutionSummary({ id: '1', workflowId: 'wf-1' });
			const b = makeExecutionSummary({ id: '2', workflowId: 'wf-1' });
			session.setCurrentWorkflowExecutions([a, b]);

			session.deleteExecution(a);
			expect(session.currentWorkflowExecutions.map((e) => e.id)).toEqual(['2']);

			session.deleteExecution('2');
			expect(session.currentWorkflowExecutions).toEqual([]);
		});

		it('clearCurrentWorkflowExecutions empties the list', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			session.clearCurrentWorkflowExecutions();
			expect(session.currentWorkflowExecutions).toEqual([]);
		});

		it('getAllLoadedFinishedExecutions filters by finished or stoppedAt', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setCurrentWorkflowExecutions([
				makeExecutionSummary({ id: '1', finished: true }),
				makeExecutionSummary({ id: '2', finished: false }),
				makeExecutionSummary({ id: '3', finished: false, stoppedAt: new Date() }),
			]);

			expect(session.getAllLoadedFinishedExecutions.map((e) => e.id).sort()).toEqual(['1', '3']);
		});
	});

	describe('lastSuccessfulExecution', () => {
		it('stores execution as id reference and resolves through executionData store', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const exec = makeExecution({ id: 'last-1', status: 'success', finished: true });

			session.setLastSuccessfulExecution(exec);

			expect(session.lastSuccessfulExecutionId).toBe('last-1');
			expect(session.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('is independent of active/displayed execution', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('active-1')).setExecution(
				makeExecution({ id: 'active-1' }),
			);
			session.setActiveExecutionId('active-1');
			session.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));

			expect(session.activeExecutionId).toBe('active-1');
			expect(session.lastSuccessfulExecutionId).toBe('last-1');
			expect(session.activeExecution?.id).toBe('active-1');
			expect(session.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('disposes the previous executionData store entry on replacement', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			const pinia = getActivePinia();
			const previousStoreId = useExecutionDataStore(createExecutionDataId('last-1')).$id;

			session.setLastSuccessfulExecution(makeExecution({ id: 'last-2' }));

			expect(pinia?.state.value[previousStoreId]).toBeUndefined();
			expect(session.lastSuccessfulExecution?.id).toBe('last-2');
		});

		it('clears via null', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			session.setLastSuccessfulExecution(null);
			expect(session.lastSuccessfulExecutionId).toBeNull();
			expect(session.lastSuccessfulExecution).toBeNull();
		});

		it('does not dispose the previous store when it is also the active execution', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			session.setActiveExecutionId('A');
			session.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			session.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(session.activeExecution?.id).toBe('A');
			expect(session.lastSuccessfulExecution?.id).toBe('B');
		});

		it('does not dispose the previous store when it is also the displayed execution', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			session.setActiveExecutionId('A');
			session.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			session.setActiveExecutionId(undefined);
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			session.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(session.displayedExecutionId).toBe('A');
			expect(session.activeExecution?.id).toBe('A');
			expect(session.lastSuccessfulExecution?.id).toBe('B');
		});
	});

	describe('chat + trigger + flags', () => {
		it('appendChatMessage / resetChatMessages round-trip', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.appendChatMessage('hello');
			session.appendChatMessage('world');
			expect(session.chatMessages).toEqual(['hello', 'world']);
			expect(session.getPastChatMessages).toEqual(['hello', 'world']);
			session.resetChatMessages();
			expect(session.chatMessages).toEqual([]);
		});

		it('setSelectedTriggerNodeName updates the value', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setSelectedTriggerNodeName('TriggerA');
			expect(session.selectedTriggerNodeName).toBe('TriggerA');
			session.setSelectedTriggerNodeName(undefined);
			expect(session.selectedTriggerNodeName).toBeUndefined();
		});

		it('setExecutionWaitingForWebhook / setIsInDebugMode toggle flags', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setExecutionWaitingForWebhook(true);
			session.setIsInDebugMode(true);
			expect(session.executionWaitingForWebhook).toBe(true);
			expect(session.isInDebugMode).toBe(true);
		});

		it('setChatPartialExecutionDestinationNode round-trip', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setChatPartialExecutionDestinationNode('NodeA');
			expect(session.chatPartialExecutionDestinationNode).toBe('NodeA');
			session.setChatPartialExecutionDestinationNode(null);
			expect(session.chatPartialExecutionDestinationNode).toBeNull();
		});
	});

	describe('renameExecutionSessionNode', () => {
		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setSelectedTriggerNodeName('Old');
			session.setChatPartialExecutionDestinationNode('Old');

			session.renameExecutionSessionNode('Old', 'New');

			expect(session.selectedTriggerNodeName).toBe('New');
			expect(session.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('does nothing when names do not match', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setSelectedTriggerNodeName('A');
			session.setChatPartialExecutionDestinationNode('B');

			session.renameExecutionSessionNode('Other', 'Renamed');

			expect(session.selectedTriggerNodeName).toBe('A');
			expect(session.chatPartialExecutionDestinationNode).toBe('B');
		});
	});

	describe('resolveExecutionTriggerNodeName', () => {
		it('returns triggerNode from active execution', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					triggerNode: 'TriggerA',
					status: 'running',
					finished: false,
				}),
			);
			session.setActiveExecutionId('exec-1');

			expect(session.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe('TriggerA');
		});

		it('falls back to runData keys for partial executions', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					status: 'running',
					finished: false,
					data: { resultData: { runData: { TriggerB: [] } } } as never,
				}),
			);
			session.setActiveExecutionId('exec-1');

			expect(session.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe('TriggerB');
		});

		it('returns undefined when not running', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			expect(session.resolveExecutionTriggerNodeName(['TriggerA'])).toBeUndefined();
		});
	});

	describe('resetExecutionSession', () => {
		it('clears every session field', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setActiveExecutionId('exec-1');
			session.setPendingExecution(makeExecution());
			session.setExecutionWaitingForWebhook(true);
			session.setIsInDebugMode(true);
			session.appendChatMessage('hi');
			session.setChatPartialExecutionDestinationNode('Node');
			session.setSelectedTriggerNodeName('Trigger');
			session.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			session.setLastSuccessfulExecutionId('last-1');

			session.resetExecutionSession();

			expect(session.activeExecutionId).toBeUndefined();
			expect(session.displayedExecutionId).toBeUndefined();
			expect(session.previousExecutionId).toBeUndefined();
			expect(session.pendingExecution).toBeNull();
			expect(session.executionWaitingForWebhook).toBe(false);
			expect(session.isInDebugMode).toBe(false);
			expect(session.chatMessages).toEqual([]);
			expect(session.chatPartialExecutionDestinationNode).toBeNull();
			expect(session.selectedTriggerNodeName).toBeUndefined();
			expect(session.currentWorkflowExecutions).toEqual([]);
			expect(session.lastSuccessfulExecutionId).toBeNull();
		});
	});

	describe('event hook', () => {
		it('fires onWorkflowExecutionSessionChange with workflowId and field discriminator', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			const spy = vi.fn();
			session.onWorkflowExecutionSessionChange(spy);

			session.setExecutionWaitingForWebhook(true);

			expect(spy).toHaveBeenCalled();
			expect(spy.mock.calls[0][0]).toMatchObject({
				action: 'update',
				payload: { workflowId: 'wf-1', field: 'executionWaitingForWebhook' },
			});
		});

		it('emits a delete action when clearing pending execution', () => {
			const session = useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId('wf-1'));
			session.setPendingExecution(makeExecution());

			const spy = vi.fn();
			session.onWorkflowExecutionSessionChange(spy);
			session.setPendingExecution(null);

			expect(spy.mock.calls.some((c) => c[0].action === 'delete')).toBe(true);
		});
	});

	describe('disposeWorkflowExecutionSessionStore', () => {
		it('removes pinia state and recreate yields fresh state', () => {
			const id = createWorkflowExecutionSessionId('wf-disposable');
			const session = useWorkflowExecutionSessionStore(id);
			const pinia = getActivePinia();
			const disposeSpy = vi.spyOn(session, '$dispose');

			session.setExecutionWaitingForWebhook(true);
			expect(pinia?.state.value[session.$id]).toBeDefined();

			disposeWorkflowExecutionSessionStore(session);

			expect(disposeSpy).toHaveBeenCalledOnce();
			expect(pinia?.state.value[session.$id]).toBeUndefined();

			const recreated = useWorkflowExecutionSessionStore(id);
			expect(recreated).not.toBe(session);
			expect(recreated.executionWaitingForWebhook).toBe(false);
		});
	});
});
