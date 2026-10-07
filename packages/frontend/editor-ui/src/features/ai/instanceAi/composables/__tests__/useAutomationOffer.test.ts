import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { InstanceAiMessage, InstanceAiToolCallState } from '@n8n/api-types';

import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { makeThread } from '../../__tests__/createThreadComponentRenderer';
import { useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import { useAutomationOffer, type PreviewRunFailure } from '../useAutomationOffer';

const PREFILL = { authorship: { kind: 'prefill', prefillType: 'automation_offer' } };

function runMessage(workflowId: string, status = 'success'): InstanceAiMessage {
	return toolMessage({
		toolCallId: `run-${workflowId}`,
		toolName: 'executions',
		args: { action: 'run', workflowId },
		result: { executionId: 'exec-1', status },
		isLoading: false,
	});
}

function publishMessage(workflowId: string): InstanceAiMessage {
	return toolMessage({
		toolCallId: `publish-${workflowId}`,
		toolName: 'workflows',
		args: { action: 'publish', workflowId },
		result: { success: true, activeVersionId: 'version-1', publishedWorkflowIds: [workflowId] },
		isLoading: false,
	});
}

function toolMessage(call: InstanceAiToolCallState): InstanceAiMessage {
	return {
		id: `msg-${call.toolCallId}`,
		role: 'assistant',
		createdAt: '2026-10-07T00:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: 'agent-1',
			role: 'orchestrator',
			status: 'completed',
			textContent: '',
			reasoning: '',
			toolCalls: [call],
			children: [],
			timeline: [],
		},
	};
}

function storedWorkflow(
	id: string,
	state: { active?: boolean; activeVersionId?: string; isArchived?: boolean },
) {
	return {
		id,
		name: `Stored ${id}`,
		active: state.active ?? false,
		activeVersionId: state.activeVersionId ?? null,
		isArchived: state.isArchived ?? false,
	} as IWorkflowDb;
}

describe('useAutomationOffer', () => {
	let scope: EffectScope;
	let thread: ThreadRuntime;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
	let instanceAiStore: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let cachedWorkflows: Record<string, IWorkflowDb>;
	let threadMetadata: Record<string, unknown> | undefined;

	function produce(...ids: string[]) {
		thread.producedArtifacts = new Map(
			ids.map((id) => [id, { type: 'workflow' as const, id, name: `Workflow ${id}` }]),
		) as ThreadRuntime['producedArtifacts'];
	}

	function setup(latestPreviewFailure?: () => PreviewRunFailure | null) {
		scope = effectScope();
		return scope.run(() => useAutomationOffer(thread, latestPreviewFailure))!;
	}

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		thread = makeThread();
		cachedWorkflows = reactive({});
		threadMetadata = undefined;

		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.getWorkflowById.mockImplementation((id: string) => cachedWorkflows[id]);
		workflowsListStore.fetchWorkflow.mockImplementation(async (id: string) =>
			storedWorkflow(id, {}),
		);

		instanceAiStore = mockedStore(useInstanceAiStore);
		instanceAiStore.getThreadMetadata.mockImplementation(() => threadMetadata);
		instanceAiStore.updateThreadMetadata.mockResolvedValue(undefined);

		produce('wf-1');
		thread.messages = [runMessage('wf-1')];
	});

	afterEach(() => {
		scope.stop();
	});

	describe('active check', () => {
		it('offers an inactive workflow from the list cache without a fetch', () => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});

			const automationOffer = setup();

			expect(automationOffer.offer).toEqual({ workflowId: 'wf-1', name: 'Workflow wf-1' });
			expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();
		});

		it.each([
			['a published version', { activeVersionId: 'version-1' }],
			['the active flag', { active: true }],
		])('offers nothing for a cached workflow with %s', (_label, published) => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', published);

			expect(setup().offer).toBeUndefined();
		});

		it('hides the offer when the cached workflow becomes active', async () => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
			const automationOffer = setup();
			expect(automationOffer.offer).toBeDefined();

			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', { activeVersionId: 'version-1' });
			await nextTick();

			expect(automationOffer.offer).toBeUndefined();
		});

		it('fetches an uncached workflow once and offers it when it is inactive', async () => {
			const automationOffer = setup();
			expect(automationOffer.offer).toBeUndefined();

			await flushPromises();
			expect(automationOffer.offer).toEqual({ workflowId: 'wf-1', name: 'Workflow wf-1' });

			thread.messages = [...thread.messages, runMessage('wf-1')];
			await flushPromises();
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('wf-1');
		});

		it('offers nothing while the fetch is in flight', async () => {
			workflowsListStore.fetchWorkflow.mockReturnValue(new Promise(() => {}));

			const automationOffer = setup();
			await flushPromises();

			expect(automationOffer.offer).toBeUndefined();
		});

		it('offers nothing for a fetched workflow that is active', async () => {
			workflowsListStore.fetchWorkflow.mockResolvedValue(
				storedWorkflow('wf-1', { activeVersionId: 'version-1' }),
			);

			const automationOffer = setup();
			await flushPromises();

			expect(automationOffer.offer).toBeUndefined();
		});

		it('offers nothing and does not fetch again when the fetch fails', async () => {
			workflowsListStore.fetchWorkflow.mockRejectedValue(new Error('Not found'));

			const automationOffer = setup();
			await flushPromises();
			thread.messages = [...thread.messages, runMessage('wf-1')];
			await flushPromises();

			expect(automationOffer.offer).toBeUndefined();
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledTimes(1);
		});

		it('falls back to an older workflow when the newest one is active', async () => {
			produce('wf-1', 'wf-2');
			thread.messages = [runMessage('wf-1'), runMessage('wf-2')];
			cachedWorkflows['wf-2'] = storedWorkflow('wf-2', { activeVersionId: 'version-1' });

			const automationOffer = setup();
			await flushPromises();

			expect(automationOffer.offer?.workflowId).toBe('wf-1');
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('wf-1');
		});

		it('ignores produced artifacts that are not workflows', () => {
			thread.producedArtifacts = new Map([
				['wf-1', { type: 'data-table', id: 'wf-1', name: 'Table' }],
			]) as ThreadRuntime['producedArtifacts'];
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});

			expect(setup().offer).toBeUndefined();
		});
	});

	describe('archived workflow', () => {
		it('offers nothing for a cached workflow that is archived', () => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', { isArchived: true });

			expect(setup().offer).toBeUndefined();
			expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();
		});

		it('offers nothing for a fetched workflow that is archived', async () => {
			workflowsListStore.fetchWorkflow.mockResolvedValue(
				storedWorkflow('wf-1', { isArchived: true }),
			);

			const automationOffer = setup();
			await flushPromises();

			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('wf-1');
			expect(automationOffer.offer).toBeUndefined();
		});

		it('hides the offer when the cached workflow is archived', async () => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
			const automationOffer = setup();
			expect(automationOffer.offer).toBeDefined();

			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', { isArchived: true });
			await nextTick();

			expect(automationOffer.offer).toBeUndefined();
		});

		it('falls back to an older workflow when the newest one is archived', async () => {
			produce('wf-1', 'wf-2');
			thread.messages = [runMessage('wf-1'), runMessage('wf-2')];
			workflowsListStore.fetchWorkflow.mockImplementation(async (id: string) =>
				storedWorkflow(id, { isArchived: id === 'wf-2' }),
			);

			const automationOffer = setup();
			await flushPromises();

			expect(automationOffer.offer?.workflowId).toBe('wf-1');
		});
	});

	describe('publish in the thread', () => {
		it('hides the offer after the Assistant publishes the workflow, also with a stale cache', async () => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
			const automationOffer = setup();
			expect(automationOffer.offer?.workflowId).toBe('wf-1');

			thread.messages = [...thread.messages, publishMessage('wf-1')];
			await nextTick();

			expect(automationOffer.offer).toBeUndefined();
			expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();
		});
	});

	describe('preview failures', () => {
		function failure(workflowId: string, executionId: string): PreviewRunFailure {
			return { workflowId, executionId };
		}

		beforeEach(() => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
		});

		it('hides the offer after the workflow fails in the preview', async () => {
			const latestFailure = ref<PreviewRunFailure | null>(null);
			const automationOffer = setup(() => latestFailure.value);
			expect(automationOffer.offer?.workflowId).toBe('wf-1');

			latestFailure.value = failure('wf-1', 'exec-2');
			await nextTick();

			expect(automationOffer.offer).toBeUndefined();
		});

		it('offers the workflow again after a newer successful run', async () => {
			const latestFailure = ref<PreviewRunFailure | null>(failure('wf-1', 'exec-2'));
			const automationOffer = setup(() => latestFailure.value);
			expect(automationOffer.offer).toBeUndefined();

			thread.messages = [...thread.messages, runMessage('wf-1')];
			await nextTick();

			expect(automationOffer.offer?.workflowId).toBe('wf-1');
		});

		it('records each failed execution one time', async () => {
			const latestFailure = ref<PreviewRunFailure | null>(failure('wf-1', 'exec-2'));
			const automationOffer = setup(() => latestFailure.value);
			thread.messages = [...thread.messages, runMessage('wf-1')];
			await nextTick();
			expect(automationOffer.offer?.workflowId).toBe('wf-1');

			// The view sends the same report again, for example after a re-render.
			latestFailure.value = { ...failure('wf-1', 'exec-2') };
			await nextTick();
			expect(automationOffer.offer?.workflowId).toBe('wf-1');

			latestFailure.value = failure('wf-1', 'exec-3');
			await nextTick();
			expect(automationOffer.offer).toBeUndefined();
		});

		it('still offers the workflow when a different workflow fails', async () => {
			const latestFailure = ref<PreviewRunFailure | null>(null);
			const automationOffer = setup(() => latestFailure.value);

			latestFailure.value = failure('wf-2', 'exec-2');
			await nextTick();

			expect(automationOffer.offer?.workflowId).toBe('wf-1');
		});
	});

	describe('busy chat', () => {
		it.each(['isStreaming', 'isSendingMessage', 'isAwaitingConfirmation'] as const)(
			'hides the offer while %s and shows it again after',
			async (flag) => {
				cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
				thread[flag] = true;
				const automationOffer = setup();
				expect(automationOffer.offer).toBeUndefined();

				thread[flag] = false;
				await nextTick();

				expect(automationOffer.offer?.workflowId).toBe('wf-1');
			},
		);

		it('waits until the chat is idle before it fetches the workflow', async () => {
			thread.isStreaming = true;
			setup();
			await flushPromises();
			expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();

			thread.isStreaming = false;
			await flushPromises();
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('wf-1');
		});
	});

	describe('accept', () => {
		beforeEach(() => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
		});

		it('sends the exact message with the prefill authorship and persists the key', async () => {
			threadMetadata = { dismissedContextKeys: ['test-agent:agent-1'] };
			const automationOffer = setup();

			await automationOffer.accept();

			expect(thread.sendMessage).toHaveBeenCalledTimes(1);
			expect(thread.sendMessage).toHaveBeenCalledWith('Make "Workflow wf-1" automatic', PREFILL);
			expect(instanceAiStore.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
				dismissedContextKeys: ['test-agent:agent-1', 'automation-offer:wf-1'],
			});
			expect(automationOffer.offer).toBeUndefined();
		});

		it('moves the focus to the composer when the panel goes away', async () => {
			const automationOffer = setup();

			await automationOffer.accept();

			expect(instanceAiStore.requestComposerFocus).toHaveBeenCalledTimes(1);
		});

		it('sends the message only once for a double click', async () => {
			const automationOffer = setup();

			await Promise.all([automationOffer.accept(), automationOffer.accept()]);

			expect(thread.sendMessage).toHaveBeenCalledTimes(1);
		});

		it('keeps the offer and persists nothing when the message is not sent', async () => {
			vi.mocked(thread.sendMessage).mockResolvedValue(false);
			const automationOffer = setup();

			await automationOffer.accept();

			expect(instanceAiStore.updateThreadMetadata).not.toHaveBeenCalled();
			expect(automationOffer.offer?.workflowId).toBe('wf-1');
		});

		it('keeps the offer when sending throws', async () => {
			vi.mocked(thread.sendMessage).mockRejectedValue(new Error('Send failed'));
			const automationOffer = setup();

			await expect(automationOffer.accept()).rejects.toThrow('Send failed');

			expect(instanceAiStore.updateThreadMetadata).not.toHaveBeenCalled();
			expect(automationOffer.offer?.workflowId).toBe('wf-1');
		});

		it('does nothing without an offer', async () => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', { activeVersionId: 'version-1' });
			const automationOffer = setup();

			await automationOffer.accept();

			expect(thread.sendMessage).not.toHaveBeenCalled();
			expect(instanceAiStore.updateThreadMetadata).not.toHaveBeenCalled();
			expect(instanceAiStore.requestComposerFocus).not.toHaveBeenCalled();
		});
	});

	describe('dismiss', () => {
		beforeEach(() => {
			cachedWorkflows['wf-1'] = storedWorkflow('wf-1', {});
		});

		it('persists the key and sends nothing', async () => {
			const automationOffer = setup();

			await automationOffer.dismiss();

			expect(thread.sendMessage).not.toHaveBeenCalled();
			expect(instanceAiStore.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
				dismissedContextKeys: ['automation-offer:wf-1'],
			});
			expect(automationOffer.offer).toBeUndefined();
			expect(instanceAiStore.requestComposerFocus).toHaveBeenCalledTimes(1);
		});

		it('keeps the offer hidden when the metadata write fails', async () => {
			instanceAiStore.updateThreadMetadata.mockRejectedValue(new Error('Write failed'));
			const automationOffer = setup();

			await expect(automationOffer.dismiss()).resolves.toBeUndefined();

			expect(automationOffer.offer).toBeUndefined();
		});

		it('offers nothing for a workflow dismissed in an earlier session', () => {
			threadMetadata = { dismissedContextKeys: ['automation-offer:wf-1'] };

			expect(setup().offer).toBeUndefined();
		});

		it('does nothing without an offer', async () => {
			thread.messages = [runMessage('wf-1', 'error')];
			const automationOffer = setup();

			await automationOffer.dismiss();

			expect(instanceAiStore.updateThreadMetadata).not.toHaveBeenCalled();
			expect(instanceAiStore.requestComposerFocus).not.toHaveBeenCalled();
		});
	});
});
