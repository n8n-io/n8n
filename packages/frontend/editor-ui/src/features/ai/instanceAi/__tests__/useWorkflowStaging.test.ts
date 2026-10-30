import type {
	InstanceAiAgentNode,
	InstanceAiAttachment,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { effectScope, nextTick, ref } from 'vue';

import { useWorkflowStaging } from '../composables/useWorkflowStaging';
import type { WorkflowDraftsByFilePath } from '../instanceAi.workflowDrafts';

function call(toolName: string, args: Record<string, unknown> = {}): InstanceAiToolCallState {
	return { toolCallId: `${toolName}-${JSON.stringify(args)}`, toolName, args, isLoading: false };
}

function tree(toolCalls: InstanceAiToolCallState[]): InstanceAiAgentNode {
	return {
		runId: 'run-1',
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls,
		children: [],
		timeline: [],
	};
}

function userMessage(attachments?: InstanceAiAttachment[]): InstanceAiMessage {
	return {
		id: 'm-user',
		role: 'user',
		createdAt: '',
		content: 'Build me a workflow',
		reasoning: '',
		isStreaming: false,
		...(attachments ? { attachments } : {}),
	};
}

function assistantMessage(
	toolCalls: InstanceAiToolCallState[],
	isStreaming = true,
): InstanceAiMessage {
	return {
		id: 'm-assistant',
		runId: 'run-1',
		role: 'assistant',
		createdAt: '',
		content: '',
		reasoning: '',
		isStreaming,
		agentTree: tree(toolCalls),
	};
}

const describeType = (type: string) =>
	type === 'n8n-nodes-base.slack' ? { displayName: 'Slack', defaultVersion: 2.3 } : undefined;

function setup(initial: InstanceAiMessage[], options: { enabled?: boolean } = {}) {
	const messages = ref<InstanceAiMessage[]>(initial);
	const drafts = ref<WorkflowDraftsByFilePath>({});
	const enabled = ref(options.enabled ?? true);
	const scope = effectScope();
	const staging = scope.run(() =>
		useWorkflowStaging({
			messages: () => messages.value,
			workflowDrafts: () => drafts.value,
			enabled: () => enabled.value,
			describeType,
		}),
	)!;
	return { ...staging, messages, drafts, enabled };
}

const loadBuilder = call('load_skill', { name: 'workflow-builder' });
const readSlack = call('get_node_types', { nodeTypes: ['n8n-nodes-base.slack', 'acme.unknown'] });

describe('useWorkflowStaging', () => {
	it('stages the node types the running agent reads as a draft of the run', () => {
		const { stagingDraft } = setup([userMessage(), assistantMessage([loadBuilder, readSlack])]);

		expect(stagingDraft.value).toMatchObject({
			filePath: 'staging:run-1',
			runId: 'run-1',
			revision: 1,
			workflow: { connections: {} },
		});
		expect(stagingDraft.value?.workflow.name).not.toBe('');
		expect(stagingDraft.value?.workflow.nodes).toEqual([
			expect.objectContaining({ name: 'Slack', type: 'n8n-nodes-base.slack', typeVersion: 2.3 }),
		]);
	});

	it('stages nothing when the experiment is off', () => {
		const { stagingDraft } = setup([userMessage(), assistantMessage([loadBuilder])], {
			enabled: false,
		});

		expect(stagingDraft.value).toBeUndefined();
	});

	it('stages nothing once the run ends', () => {
		const { stagingDraft } = setup([userMessage(), assistantMessage([loadBuilder], false)]);

		expect(stagingDraft.value).toBeUndefined();
	});

	it.each<[string, InstanceAiAttachment]>([
		['a workflow', { type: 'workflow', id: 'wf-1', name: 'Saved' }],
		[
			'nodes of a workflow',
			{
				type: 'nodes',
				workflowId: 'wf-1',
				workflowName: 'Saved',
				sets: [{ nodes: [{ id: 'n-1', name: 'Slack' }] }],
			},
		],
	])('stages nothing when the user message attaches %s', (_, attachment) => {
		const { stagingDraft } = setup([userMessage([attachment]), assistantMessage([loadBuilder])]);

		expect(stagingDraft.value).toBeUndefined();
	});

	it('ends when the run has its first draft', async () => {
		const { stagingDraft, drafts } = setup([userMessage(), assistantMessage([loadBuilder])]);

		drafts.value = {
			'a.ts': {
				filePath: 'a.ts',
				revision: 1,
				runId: 'run-1',
				workflow: { name: 'A', nodes: [], connections: {} },
			},
		};
		await nextTick();

		expect(stagingDraft.value).toBeUndefined();
	});

	it('reports the step of the running agent', () => {
		const { buildStep } = setup([
			userMessage(),
			assistantMessage([loadBuilder, call('search_nodes', { queries: ['slack'] })]),
		]);

		expect(buildStep.value).toEqual({ kind: 'searching', queries: ['slack'] });
	});

	it('reports no step once the run ends', () => {
		const { buildStep } = setup([userMessage(), assistantMessage([loadBuilder], false)]);

		expect(buildStep.value).toBeUndefined();
	});
});
