import { nextTick } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, test, it, expect, vi, beforeEach } from 'vitest';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiMessage } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { USER_TYPED_MESSAGE } from '../prefills';
import {
	consumePendingFirstMessage,
	consumePendingFirstMessageFiles,
} from '../instanceAi.pendingFirstMessage';
import {
	createThreadRuntime,
	getAgentBuilderTargetFromThreadMetadata,
	getAgentBuilderTargetsFromThreadMetadata,
	getAgentPreviewSessionFromThreadMetadata,
	getAgentPreviewViewFromThreadMetadata,
	getSetupItemsFromThreadMetadata,
	getTasksFromThreadMetadata,
	type ThreadRuntime,
	type ThreadRuntimeHooks,
} from '../instanceAi.threadRuntime';

const mockTelemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({
		track: (...args: unknown[]) => mockTelemetryTrack(...args),
	}),
}));

function setupRuntimePinia() {
	setActivePinia(createTestingPinia());
	const rootStore = mockedStore(useRootStore);
	rootStore.instanceId = 'instance-1';
	const workflowsListStore = mockedStore(useWorkflowsListStore);
	workflowsListStore.getWorkflowById.mockReturnValue(
		undefined as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>,
	);
}

let metadata: Record<string, unknown> | undefined;
let hooks: ThreadRuntimeHooks;

function createRuntime(threadId = 'thread-1'): ThreadRuntime {
	return createThreadRuntime(threadId, hooks);
}

function createRuntimeRegistry() {
	const runtimes = new Map<string, ThreadRuntime>();
	return {
		getOrCreateRuntime(threadId: string) {
			const existing = runtimes.get(threadId);
			if (existing) return existing;
			const runtime = createRuntime(threadId);
			runtimes.set(threadId, runtime);
			return runtime;
		},
	};
}

function assistantMessage(
	toolCalls: NonNullable<InstanceAiMessage['agentTree']>['toolCalls'],
	isStreaming = false,
): InstanceAiMessage {
	return {
		id: 'a-1',
		role: 'assistant',
		createdAt: '2026-01-01T00:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming,
		agentTree: {
			agentId: 'agent-001',
			role: 'orchestrator',
			status: isStreaming ? 'active' : 'completed',
			textContent: '',
			reasoning: '',
			toolCalls,
			children: [],
			timeline: [],
		},
	};
}

beforeEach(() => {
	setupRuntimePinia();
	localStorage.clear();
	mockTelemetryTrack.mockClear();
	metadata = undefined;
	hooks = { getThreadMetadata: () => metadata, onOnboardingLeft: vi.fn() };
});

describe('transient workflow references', () => {
	beforeEach(() => {
		setupRuntimePinia();
	});

	it('keeps draft artifacts thread-scoped and removes the final reference', async () => {
		const registry = createRuntimeRegistry();
		const first = registry.getOrCreateRuntime('thread-1');
		const second = registry.getOrCreateRuntime('thread-2');
		first.upsertTransientWorkflowReference({
			referenceId: 'draft-1',
			workflowId: 'wf-1',
			workflowName: 'Orders',
		});
		first.upsertTransientWorkflowReference({
			referenceId: 'draft-2',
			workflowId: 'wf-1',
			workflowName: 'Orders',
		});
		await nextTick();

		expect(first.producedArtifacts.get('wf-1')?.name).toBe('Orders');
		expect(second.producedArtifacts.has('wf-1')).toBe(false);

		first.removeTransientWorkflowReference('draft-1');
		await nextTick();
		expect(first.producedArtifacts.has('wf-1')).toBe(true);

		first.removeTransientWorkflowReference('draft-2');
		await nextTick();
		expect(first.producedArtifacts.has('wf-1')).toBe(false);
	});

	it('clears transient references when the runtime resets', async () => {
		const runtime = createRuntimeRegistry().getOrCreateRuntime('thread-1');
		runtime.upsertTransientWorkflowReference({
			referenceId: 'draft-1',
			workflowId: 'wf-1',
			workflowName: 'Orders',
		});
		runtime.resetState();
		await nextTick();

		expect(runtime.transientWorkflowReferences.size).toBe(0);
		expect(runtime.producedArtifacts.has('wf-1')).toBe(false);
	});
});

describe('createThreadRuntime - Agents chat mirror', () => {
	it('waits for the first sync, then mirrors the chat messages and working state', async () => {
		const runtime = createRuntime();
		runtime.enterAgentsChatMode();
		expect(runtime.hydrationStatus).toBe('hydrating');

		runtime.syncAgentsChat(
			[
				assistantMessage(
					[
						{
							toolCallId: 'tc-1',
							toolName: 'build-workflow',
							args: {},
							result: { success: true, workflowId: 'wf-1', workflowName: 'Orders' },
							isLoading: false,
						},
					],
					true,
				),
			],
			true,
			true,
		);
		await nextTick();

		expect(runtime.hydrationStatus).toBe('ready');
		expect(runtime.isStreaming).toBe(true);
		expect(runtime.isAwaitingConfirmation).toBe(true);
		expect(runtime.producedArtifacts.get('wf-1')?.name).toBe('Orders');

		runtime.syncAgentsChat(runtime.messages, false);
		expect(runtime.isStreaming).toBe(false);
		expect(runtime.isAwaitingConfirmation).toBe(false);
	});

	it('reports an onboarding exit from a live tool call but not from history', () => {
		const runtime = createRuntime();
		const leave = assistantMessage([
			{
				toolCallId: 'tc-1',
				toolName: 'leave-onboarding',
				args: { reason: 'skip' },
				isLoading: false,
			},
		]);

		runtime.syncAgentsChat([leave], false);
		expect(hooks.onOnboardingLeft).not.toHaveBeenCalled();

		runtime.syncAgentsChat([leave], false);
		expect(hooks.onOnboardingLeft).toHaveBeenCalledWith('thread-1', 'left', 'skip');
	});

	it('tracks a new build once the history is in', () => {
		const runtime = createRuntime();
		runtime.syncAgentsChat([], false);
		runtime.syncAgentsChat(
			[
				assistantMessage([
					{
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						args: {},
						result: { success: true, workflowId: 'wf-1' },
						isLoading: false,
					},
				]),
			],
			false,
		);

		expect(mockTelemetryTrack).toHaveBeenCalledWith('User viewed new builder workflow', {
			thread_id: 'thread-1',
			instance_id: 'instance-1',
			workflow_id: 'wf-1',
		});
	});
});

describe('createThreadRuntime - thread metadata panels', () => {
	it('reads the planned tasks from thread metadata before the agent checklist', () => {
		const runtime = createRuntime();
		runtime.syncAgentsChat(
			[
				{
					...assistantMessage([]),
					agentTree: {
						...assistantMessage([]).agentTree!,
						tasks: { tasks: [{ id: 'c-1', description: 'Checklist', status: 'todo' }] },
					},
				},
			],
			false,
		);
		expect(runtime.currentTasks?.tasks[0].description).toBe('Checklist');

		metadata = {
			instanceAiTasks: { tasks: [{ id: 'p-1', description: 'Planned', status: 'in_progress' }] },
		};
		const withMetadata = createRuntime('thread-2');
		expect(withMetadata.currentTasks?.tasks[0].description).toBe('Planned');
	});

	it('reads the setup items from thread metadata, latest workflow last', () => {
		metadata = {
			instanceAiSetupItems: { 'wf-1': [], 'wf-2': [] },
		};
		const runtime = createRuntime();

		expect(Object.keys(runtime.setupItemsByWorkflowId)).toEqual(['wf-1', 'wf-2']);
		expect(runtime.latestSetupWorkflowId).toBe('wf-2');
	});
});

describe('createThreadRuntime - sendMessage', () => {
	it('stashes the message as the pending first message while no chat is mounted', async () => {
		const runtime = createRuntime();
		const file = new File(['x'], 'a.txt');

		const sent = await runtime.sendMessage('hello', {
			authorship: USER_TYPED_MESSAGE,
			attachments: [{ type: 'workflow', id: 'wf-1' }],
			files: [file],
			handoffContext: { source: 'setup-panel-execute', workflowId: 'wf-1' },
		});

		expect(sent).toBe(true);
		expect(consumePendingFirstMessage('thread-1')).toEqual(
			expect.objectContaining({
				message: 'hello',
				attachments: [{ type: 'workflow', id: 'wf-1' }],
				context: expect.objectContaining({ source: 'setup-panel-execute' }),
			}),
		);
		expect(consumePendingFirstMessageFiles('thread-1')).toEqual([file]);
	});

	it('sends through the registered chat and tracks the message', async () => {
		const runtime = createRuntime();
		const sender = vi.fn().mockResolvedValue(true);
		const unregister = runtime.registerChatSender(sender);

		const sent = await runtime.sendMessage('fix it', {
			authorship: { kind: 'prefill', prefillType: 'handoff_fix_with_ai' },
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'Orders' }],
		});

		expect(sent).toBe(true);
		expect(sender).toHaveBeenCalledWith({
			message: 'fix it',
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'Orders' }],
		});
		expect(mockTelemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
			expect.objectContaining({
				thread_id: 'thread-1',
				prefill_type: 'handoff_fix_with_ai',
				attachment_count: 1,
			}),
		);
		await nextTick();
		expect(runtime.producedArtifacts.get('wf-1')?.name).toBe('Orders');

		unregister();
		await runtime.sendMessage('later', { authorship: USER_TYPED_MESSAGE });
		expect(sender).toHaveBeenCalledTimes(1);
	});

	it('does not track a message the chat refused', async () => {
		const runtime = createRuntime();
		runtime.registerChatSender(vi.fn().mockResolvedValue(false));

		const sent = await runtime.sendMessage('hello', { authorship: USER_TYPED_MESSAGE });

		expect(sent).toBe(false);
		expect(mockTelemetryTrack).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE,
			expect.anything(),
		);
	});
});

describe('getTasksFromThreadMetadata', () => {
	test('returns null for a missing, invalid or empty checklist', () => {
		expect(getTasksFromThreadMetadata(undefined)).toBeNull();
		expect(getTasksFromThreadMetadata({ instanceAiTasks: { tasks: 'nope' } })).toBeNull();
		expect(getTasksFromThreadMetadata({ instanceAiTasks: { tasks: [] } })).toBeNull();
	});
});

describe('getSetupItemsFromThreadMetadata', () => {
	test('skips unsafe keys and non-array values', () => {
		expect(
			getSetupItemsFromThreadMetadata({
				instanceAiSetupItems: JSON.parse('{"__proto__": [], "wf-1": [], "wf-2": "bad"}'),
			}),
		).toEqual({ 'wf-1': [] });
	});
});

describe('getAgentBuilderTargetFromThreadMetadata', () => {
	test('passes the persisted name through', () => {
		expect(
			getAgentBuilderTargetFromThreadMetadata({
				instanceAiAgentBuilderTarget: {
					agentId: 'agent-1',
					projectId: 'proj-1',
					name: 'Support Bot',
				},
			}),
		).toEqual({ agentId: 'agent-1', projectId: 'proj-1', name: 'Support Bot' });
	});

	test('drops a non-string name but still returns the target', () => {
		expect(
			getAgentBuilderTargetFromThreadMetadata({
				instanceAiAgentBuilderTarget: { agentId: 'agent-1', projectId: 'proj-1', name: 42 },
			}),
		).toEqual({ agentId: 'agent-1', projectId: 'proj-1' });
	});

	test('returns undefined when agentId or projectId is missing', () => {
		expect(
			getAgentBuilderTargetFromThreadMetadata({
				instanceAiAgentBuilderTarget: { projectId: 'proj-1', name: 'Support Bot' },
			}),
		).toBeUndefined();
	});
});

describe('getAgentBuilderTargetsFromThreadMetadata', () => {
	test('reads all valid targets from the persisted registry', () => {
		expect(
			getAgentBuilderTargetsFromThreadMetadata({
				instanceAiAgentBuilderTargets: {
					first: { agentId: 'agent-1', projectId: 'project-1', ref: 'first' },
					second: { agentId: 'agent-2', projectId: 'project-2' },
					invalid: { agentId: 'agent-3' },
				},
			}),
		).toEqual([
			{ agentId: 'agent-1', projectId: 'project-1' },
			{ agentId: 'agent-2', projectId: 'project-2' },
		]);
	});
});

describe('getAgentPreviewViewFromThreadMetadata', () => {
	test('returns the persisted agent preview session', () => {
		expect(
			getAgentPreviewViewFromThreadMetadata({
				instanceAiAgentPreviewView: {
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
				},
			}),
		).toEqual({ agentId: 'agent-1', threadId: 'preview-thread-1' });
	});

	test('returns undefined for incomplete metadata', () => {
		expect(
			getAgentPreviewViewFromThreadMetadata({
				instanceAiAgentPreviewView: { agentId: 'agent-1' },
			}),
		).toBeUndefined();
	});
});

describe('getAgentPreviewSessionFromThreadMetadata', () => {
	test('returns the canonical agent preview session', () => {
		expect(
			getAgentPreviewSessionFromThreadMetadata({
				instanceAiAgentPreviewSession: {
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
					executionId: 'execution-1',
				},
			}),
		).toEqual({ agentId: 'agent-1', threadId: 'preview-thread-1' });
	});

	test('returns undefined for incomplete metadata', () => {
		expect(
			getAgentPreviewSessionFromThreadMetadata({
				instanceAiAgentPreviewSession: { threadId: 'preview-thread-1' },
			}),
		).toBeUndefined();
	});
});

