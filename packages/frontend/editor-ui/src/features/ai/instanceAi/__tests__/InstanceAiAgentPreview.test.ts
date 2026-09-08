import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstanceAiMessage } from '@n8n/api-types';
import type { AgentResource } from '@/features/agents/types';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
} from '../instanceAi.threadRuntime';

const threadState = {
	id: 'thread-1',
	messages: [] as InstanceAiMessage[],
};
const metadataState = ref<Record<string, unknown>>();
const updateThreadMetadataMock = vi.fn(
	async (_threadId: string, metadata: Record<string, unknown>) => {
		metadataState.value = { ...metadataState.value, ...metadata };
	},
);

vi.mock('../instanceAi.store', () => ({
	useThread: () => threadState,
	useInstanceAiStore: () => ({
		getThreadMetadata: () => metadataState.value,
		updateThreadMetadata: updateThreadMetadataMock,
		setThreadMetadata: (_threadId: string, metadata: Record<string, unknown> | undefined) => {
			metadataState.value = metadata;
		},
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: '' } }),
}));

const persistPendingAgentMock = vi.fn();
vi.mock('../instanceAi.memory.api', () => ({
	persistPendingAgent: (...args: unknown[]) => persistPendingAgentMock(...args),
}));

const persistedAgent = {
	id: 'agent-1',
	name: 'Support Agent',
} as AgentResource;

const AgentBuilderViewStub = {
	name: 'AgentBuilderView',
	props: ['artifactPreviewSessionId', 'artifactPersistAgent', 'artifactEditingLocked'],
	emits: ['name-saved', 'preview-open-change', 'assistant-handoff'],
	template: '<div />',
};

function makeBuildingMessage(targetAgentId: string): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: true,
		createdAt: new Date().toISOString(),
		agentTree: {
			agentId: 'root',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			timeline: [],
			children: [
				{
					agentId: 'builder-1',
					kind: 'agent-builder',
					role: 'agent-builder',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					timeline: [],
					children: [],
					targetResource: { type: 'agent', id: targetAgentId },
				},
			],
		},
	} as InstanceAiMessage;
}

describe('InstanceAiAgentPreview', () => {
	beforeEach(() => {
		metadataState.value = {
			instanceAiPendingAgentTarget: {
				agentId: 'agent-1',
				projectId: 'project-1',
			},
		};
		threadState.messages = [];
		updateThreadMetadataMock.mockClear();
		persistPendingAgentMock.mockReset();
	});

	it('forwards preview dock state and Assistant handoffs from Agent Builder', async () => {
		const wrapper = mount(InstanceAiAgentPreview, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				previewSessionId: 'preview-session-1',
			},
			global: {
				stubs: { AgentBuilderView: AgentBuilderViewStub },
			},
		});

		const builder = wrapper.findComponent({ name: 'AgentBuilderView' });
		expect(builder.props('artifactPreviewSessionId')).toBe('preview-session-1');
		builder.vm.$emit('preview-open-change', true);
		const handoff = {
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'preview-session-1',
			executionId: 'execution-1',
			initialDraft: 'Fix the failed tool calls',
		};
		builder.vm.$emit('assistant-handoff', handoff);
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('preview-open-change')).toEqual([[true]]);
		expect(wrapper.emitted('assistant-handoff')).toEqual([[handoff]]);
	});

	it('shows the building indicator and locks editing while the AI mutates this agent', () => {
		threadState.messages = [makeBuildingMessage('agent-1')];

		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1' },
			global: { stubs: { AgentBuilderView: AgentBuilderViewStub } },
		});

		expect(wrapper.find('[data-test-id="instance-ai-agent-building-indicator"]').exists()).toBe(
			true,
		);
		expect(wrapper.findComponent({ name: 'AgentBuilderView' }).props('artifactEditingLocked')).toBe(
			true,
		);
	});

	it('hides the building indicator when the AI is working on a different agent', () => {
		threadState.messages = [makeBuildingMessage('agent-other')];

		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1' },
			global: { stubs: { AgentBuilderView: AgentBuilderViewStub } },
		});

		expect(wrapper.find('[data-test-id="instance-ai-agent-building-indicator"]').exists()).toBe(
			false,
		);
		expect(wrapper.findComponent({ name: 'AgentBuilderView' }).props('artifactEditingLocked')).toBe(
			false,
		);
	});

	it('keeps the bound thread target in sync across persistence and renames', async () => {
		// One server call creates/adopts the agent AND swaps pending for bound, so
		// the metadata the FE keeps is the server's, not a local merge.
		persistPendingAgentMock.mockResolvedValue({
			agent: persistedAgent,
			thread: {
				id: 'thread-1',
				metadata: {
					instanceAiAgentBuilderTarget: {
						agentId: 'agent-1',
						projectId: 'project-1',
						name: 'Support Agent',
					},
				},
			},
		});
		const wrapper = mount(InstanceAiAgentPreview, {
			props: {
				agentId: 'agent-1',
				projectId: 'project-1',
				pending: true,
			},
			global: {
				stubs: {
					AgentBuilderView: AgentBuilderViewStub,
				},
			},
		});
		const builder = wrapper.findComponent({ name: 'AgentBuilderView' });

		const persist = builder.props('artifactPersistAgent') as (
			name: string,
		) => Promise<AgentResource>;
		await expect(persist('Support Agent')).resolves.toBe(persistedAgent);
		await flushPromises();

		expect(persistPendingAgentMock).toHaveBeenCalledWith(expect.anything(), 'thread-1', {
			projectId: 'project-1',
			agentId: 'agent-1',
			name: 'Support Agent',
		});
		expect(getPendingAgentTargetFromThreadMetadata(metadataState.value)).toBeUndefined();
		expect(getAgentBuilderTargetFromThreadMetadata(metadataState.value)).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			name: 'Support Agent',
		});

		builder.vm.$emit('name-saved', 'Renamed Support Agent');
		await flushPromises();

		expect(getAgentBuilderTargetFromThreadMetadata(metadataState.value)?.name).toBe(
			'Renamed Support Agent',
		);
	});
});
