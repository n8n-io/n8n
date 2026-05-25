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
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

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
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-42'),
			);
			expect(executionStateStore.$id).toBe(getWorkflowExecutionStateStoreId('wf-42'));
			expect(executionStateStore.workflowId).toBe('wf-42');
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
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			expect(executionStateStore.activeExecutionId).toBeUndefined();
		});

		it('null indicates execution started but id pending', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId(null);
			expect(executionStateStore.activeExecutionId).toBeNull();
		});

		it('string indicates known execution id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.activeExecutionId).toBe('exec-1');
		});

		it('rolls activeExecutionId into previousExecutionId on transition to a new id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId('exec-2');
			expect(executionStateStore.previousExecutionId).toBe('exec-1');
			expect(executionStateStore.activeExecutionId).toBe('exec-2');
		});

		it('does not update previousExecutionId when clearing to undefined', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);
			expect(executionStateStore.previousExecutionId).toBeUndefined();
			expect(executionStateStore.activeExecutionId).toBeUndefined();
		});

		it('setting a string id also sets displayedExecutionId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.displayedExecutionId).toBe('exec-1');
		});

		it('clearing activeExecutionId preserves displayedExecutionId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);
			expect(executionStateStore.displayedExecutionId).toBe('exec-1');
		});
	});

	describe('activeExecution routing', () => {
		it('returns pendingExecution when activeExecutionId === null', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const scaffold = makeExecution({ id: '__IN_PROGRESS__' });
			executionStateStore.setPendingExecution(scaffold);
			executionStateStore.setActiveExecutionId(null);

			expect(executionStateStore.activeExecution?.id).toBe('__IN_PROGRESS__');
		});

		it('returns the executionData store entry when activeExecutionId is a string', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			dataStore.setExecution(makeExecution({ id: 'exec-1' }));

			executionStateStore.setActiveExecutionId('exec-1');

			expect(executionStateStore.activeExecution?.id).toBe('exec-1');
		});

		it('falls back to displayed execution after active is cleared', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			dataStore.setExecution(makeExecution({ id: 'exec-1' }));

			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);

			expect(executionStateStore.activeExecution?.id).toBe('exec-1');
		});

		it('returns null when nothing is set', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			expect(executionStateStore.activeExecution).toBeNull();
		});
	});

	describe('promotePendingExecution', () => {
		it('migrates the pending scaffold into a fresh executionData store and sets activeExecutionId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				data: {
					resultData: { runData: { Trigger: [{ executionStatus: 'success' } as never] } },
				} as never,
			});
			executionStateStore.setPendingExecution(scaffold);
			executionStateStore.setActiveExecutionId(null);

			executionStateStore.promotePendingExecution('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();

			const dataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(dataStore.execution?.id).toBe('exec-real');
			expect(dataStore.execution?.data?.resultData.runData.Trigger).toBeDefined();
		});

		it('still sets activeExecutionId when no pending scaffold exists', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);

			executionStateStore.promotePendingExecution('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();
		});

		it('setActiveExecutionId(string) migrates a staged pending scaffold into the id-keyed store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				executedNode: 'Code',
				data: {
					resultData: { runData: {} },
				} as never,
			});
			executionStateStore.setPendingExecution(scaffold);
			executionStateStore.setActiveExecutionId(null);

			executionStateStore.setActiveExecutionId('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();

			const dataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(dataStore.execution?.id).toBe('exec-real');
			expect(dataStore.execution?.executedNode).toBe('Code');
		});

		it('setActiveExecutionId(string) without a pending scaffold does not promote', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);

			executionStateStore.setActiveExecutionId('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();
			const dataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(dataStore.execution).toBeNull();
		});
	});

	describe('isWorkflowRunning', () => {
		it('is true when activeExecutionId is null (pending)', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId(null);
			expect(executionStateStore.isWorkflowRunning).toBe(true);
		});

		it('is true when active execution is running and not finished', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'running', finished: false }),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.isWorkflowRunning).toBe(true);
		});

		it('is false when active execution is finished', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'success', finished: true }),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.isWorkflowRunning).toBe(false);
		});

		it('is false when no active execution is tracked', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			expect(executionStateStore.isWorkflowRunning).toBe(false);
		});
	});

	describe('currentWorkflowExecutions', () => {
		it('addToCurrentExecutions filters by workflowId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'other-wf' }),
			]);

			expect(executionStateStore.currentWorkflowExecutions).toHaveLength(1);
			expect(executionStateStore.currentWorkflowExecutions[0].id).toBe('1');
		});

		it('addToCurrentExecutions deduplicates by id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
			]);
			executionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'wf-1' }),
			]);

			expect(executionStateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['1', '2']);
		});

		it('deleteExecution accepts both summary and id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const a = makeExecutionSummary({ id: '1', workflowId: 'wf-1' });
			const b = makeExecutionSummary({ id: '2', workflowId: 'wf-1' });
			executionStateStore.setCurrentWorkflowExecutions([a, b]);

			executionStateStore.deleteExecution(a);
			expect(executionStateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['2']);

			executionStateStore.deleteExecution('2');
			expect(executionStateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('clearCurrentWorkflowExecutions empties the list', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			executionStateStore.clearCurrentWorkflowExecutions();
			expect(executionStateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('getAllLoadedFinishedExecutions filters by finished or stoppedAt', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setCurrentWorkflowExecutions([
				makeExecutionSummary({ id: '1', finished: true }),
				makeExecutionSummary({ id: '2', finished: false }),
				makeExecutionSummary({ id: '3', finished: false, stoppedAt: new Date() }),
			]);

			expect(executionStateStore.getAllLoadedFinishedExecutions.map((e) => e.id).sort()).toEqual([
				'1',
				'3',
			]);
		});
	});

	describe('lastSuccessfulExecution', () => {
		it('stores execution as id reference and resolves through executionData store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const exec = makeExecution({ id: 'last-1', status: 'success', finished: true });

			executionStateStore.setLastSuccessfulExecution(exec);

			expect(executionStateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('is independent of active/displayed execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('active-1')).setExecution(
				makeExecution({ id: 'active-1' }),
			);
			executionStateStore.setActiveExecutionId('active-1');
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));

			expect(executionStateStore.activeExecutionId).toBe('active-1');
			expect(executionStateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(executionStateStore.activeExecution?.id).toBe('active-1');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('disposes the previous executionData store entry on replacement', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			const pinia = getActivePinia();
			const previousStoreId = useExecutionDataStore(createExecutionDataId('last-1')).$id;

			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-2' }));

			expect(pinia?.state.value[previousStoreId]).toBeUndefined();
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('last-2');
		});

		it('clears via null', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			executionStateStore.setLastSuccessfulExecution(null);
			expect(executionStateStore.lastSuccessfulExecutionId).toBeNull();
			expect(executionStateStore.lastSuccessfulExecution).toBeNull();
		});

		it('does not dispose the previous store when it is also the active execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			executionStateStore.setActiveExecutionId('A');
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(executionStateStore.activeExecution?.id).toBe('A');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('B');
		});

		it('does not dispose the previous store when it is also the displayed execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			executionStateStore.setActiveExecutionId('A');
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			executionStateStore.setActiveExecutionId(undefined);
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(executionStateStore.displayedExecutionId).toBe('A');
			expect(executionStateStore.activeExecution?.id).toBe('A');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('B');
		});
	});

	describe('chat + trigger + flags', () => {
		it('appendChatMessage / resetChatMessages round-trip', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.appendChatMessage('hello');
			executionStateStore.appendChatMessage('world');
			expect(executionStateStore.chatMessages).toEqual(['hello', 'world']);
			expect(executionStateStore.getPastChatMessages).toEqual(['hello', 'world']);
			executionStateStore.resetChatMessages();
			expect(executionStateStore.chatMessages).toEqual([]);
		});

		it('setSelectedTriggerNodeName updates the value', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setSelectedTriggerNodeName('TriggerA');
			expect(executionStateStore.selectedTriggerNodeName).toBe('TriggerA');
			executionStateStore.setSelectedTriggerNodeName(undefined);
			expect(executionStateStore.selectedTriggerNodeName).toBeUndefined();
		});

		it('setExecutionWaitingForWebhook / setIsInDebugMode toggle flags', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setExecutionWaitingForWebhook(true);
			executionStateStore.setIsInDebugMode(true);
			expect(executionStateStore.executionWaitingForWebhook).toBe(true);
			expect(executionStateStore.isInDebugMode).toBe(true);
		});

		it('setChatPartialExecutionDestinationNode round-trip', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setChatPartialExecutionDestinationNode('NodeA');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('NodeA');
			executionStateStore.setChatPartialExecutionDestinationNode(null);
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBeNull();
		});
	});

	describe('renameExecutionStateNode', () => {
		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setSelectedTriggerNodeName('Old');
			executionStateStore.setChatPartialExecutionDestinationNode('Old');

			executionStateStore.renameExecutionStateNode('Old', 'New');

			expect(executionStateStore.selectedTriggerNodeName).toBe('New');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('does nothing when names do not match', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setSelectedTriggerNodeName('A');
			executionStateStore.setChatPartialExecutionDestinationNode('B');

			executionStateStore.renameExecutionStateNode('Other', 'Renamed');

			expect(executionStateStore.selectedTriggerNodeName).toBe('A');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('B');
		});
	});

	describe('resolveExecutionTriggerNodeName', () => {
		it('returns triggerNode from active execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					triggerNode: 'TriggerA',
					status: 'running',
					finished: false,
				}),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			expect(executionStateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe(
				'TriggerA',
			);
		});

		it('falls back to runData keys for partial executions', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					status: 'running',
					finished: false,
					data: { resultData: { runData: { TriggerB: [] } } } as never,
				}),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			expect(executionStateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe(
				'TriggerB',
			);
		});

		it('returns undefined when not running', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			expect(executionStateStore.resolveExecutionTriggerNodeName(['TriggerA'])).toBeUndefined();
		});
	});

	describe('resetExecutionState', () => {
		it('clears every state field', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setPendingExecution(makeExecution());
			executionStateStore.setExecutionWaitingForWebhook(true);
			executionStateStore.setIsInDebugMode(true);
			executionStateStore.appendChatMessage('hi');
			executionStateStore.setChatPartialExecutionDestinationNode('Node');
			executionStateStore.setSelectedTriggerNodeName('Trigger');
			executionStateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			executionStateStore.setLastSuccessfulExecutionId('last-1');

			executionStateStore.resetExecutionState();

			expect(executionStateStore.activeExecutionId).toBeUndefined();
			expect(executionStateStore.displayedExecutionId).toBeUndefined();
			expect(executionStateStore.previousExecutionId).toBeUndefined();
			expect(executionStateStore.pendingExecution).toBeNull();
			expect(executionStateStore.executionWaitingForWebhook).toBe(false);
			expect(executionStateStore.isInDebugMode).toBe(false);
			expect(executionStateStore.chatMessages).toEqual([]);
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBeNull();
			expect(executionStateStore.selectedTriggerNodeName).toBeUndefined();
			expect(executionStateStore.currentWorkflowExecutions).toEqual([]);
			expect(executionStateStore.lastSuccessfulExecutionId).toBeNull();
		});

		it('disposes per-execution data stores for every tracked id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);

			// Three sequential runs — exec-1 rolls out of previousExecutionId after exec-3.
			executionStateStore.setActiveExecutionId('exec-1');
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			executionStateStore.setActiveExecutionId('exec-2');
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				makeExecution({ id: 'exec-2' }),
			);
			executionStateStore.setActiveExecutionId('exec-3');
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				makeExecution({ id: 'exec-3' }),
			);

			executionStateStore.resetExecutionState();

			// All three stores must be disposed — even exec-1 which is in no slot.
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('disposes the IN_PROGRESS placeholder store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setPendingExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID, status: 'running' }),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			executionStateStore.resetExecutionState();

			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});
	});

	describe('trackExecutionId', () => {
		it('tracks ids written via setActiveExecutionId across rolling runs', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);

			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId('exec-2');
			executionStateStore.setActiveExecutionId('exec-3');

			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				makeExecution({ id: 'exec-2' }),
			);
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				makeExecution({ id: 'exec-3' }),
			);

			executionStateStore.resetExecutionState();

			// All three are disposed even though exec-1 is in no slot after run 3.
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('tracks ids written via setLastSuccessfulExecution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setLastSuccessfulExecution(
				makeExecution({ id: 'exec-success', finished: true, status: 'success' }),
			);

			executionStateStore.resetExecutionState();

			expect(useExecutionDataStore(createExecutionDataId('exec-success')).execution).toBeNull();
		});

		it('does not track the IN_PROGRESS placeholder id (handled separately)', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.trackExecutionId(IN_PROGRESS_EXECUTION_ID);
			executionStateStore.trackExecutionId('real-exec');

			useExecutionDataStore(createExecutionDataId('real-exec')).setExecution(
				makeExecution({ id: 'real-exec' }),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			executionStateStore.resetExecutionState();

			// Both stores get disposed: real-exec via tracked set, IN_PROGRESS unconditionally.
			expect(useExecutionDataStore(createExecutionDataId('real-exec')).execution).toBeNull();
			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});

		it('ignores null and undefined ids', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.trackExecutionId(null);
			executionStateStore.trackExecutionId(undefined);
			executionStateStore.trackExecutionId('');

			// resetExecutionState must complete without error and produce no surprising side effects.
			expect(() => executionStateStore.resetExecutionState()).not.toThrow();
		});
	});

	describe('event hook', () => {
		it('fires onWorkflowExecutionStateChange with workflowId and field discriminator', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			const spy = vi.fn();
			executionStateStore.onWorkflowExecutionStateChange(spy);

			executionStateStore.setExecutionWaitingForWebhook(true);

			expect(spy).toHaveBeenCalled();
			expect(spy.mock.calls[0][0]).toMatchObject({
				action: 'update',
				payload: { workflowId: 'wf-1', field: 'executionWaitingForWebhook' },
			});
		});

		it('emits a delete action when clearing pending execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(
				createWorkflowExecutionStateId('wf-1'),
			);
			executionStateStore.setPendingExecution(makeExecution());

			const spy = vi.fn();
			executionStateStore.onWorkflowExecutionStateChange(spy);
			executionStateStore.setPendingExecution(null);

			expect(spy.mock.calls.some((c) => c[0].action === 'delete')).toBe(true);
		});
	});

	describe('disposeWorkflowExecutionStateStore', () => {
		it('removes pinia state and recreate yields fresh state', () => {
			const id = createWorkflowExecutionStateId('wf-disposable');
			const executionStateStore = useWorkflowExecutionStateStore(id);
			const pinia = getActivePinia();
			const disposeSpy = vi.spyOn(executionStateStore, '$dispose');

			executionStateStore.setExecutionWaitingForWebhook(true);
			expect(pinia?.state.value[executionStateStore.$id]).toBeDefined();

			disposeWorkflowExecutionStateStore(executionStateStore);

			expect(disposeSpy).toHaveBeenCalledOnce();
			expect(pinia?.state.value[executionStateStore.$id]).toBeUndefined();

			const recreated = useWorkflowExecutionStateStore(id);
			expect(recreated).not.toBe(executionStateStore);
			expect(recreated.executionWaitingForWebhook).toBe(false);
		});
	});
});
