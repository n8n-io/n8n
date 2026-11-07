import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstanceAiMessage } from '@n8n/api-types';
import type { AgentCreationResource } from '@/features/agents/types';
import type { persistPendingAgent } from '../instanceAi.memory.api';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
} from '../instanceAi.threadRuntime';

const threadState = reactive({
	id: 'thread-1',
	messages: [] as InstanceAiMessage[],
	activeArtifactId: undefined as string | undefined,
	isSendingMessage: false,
	isStreaming: false,
});
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
} as AgentCreationResource;

const AgentBuilderViewStub = {
	name: 'AgentBuilderView',
	props: [
		'artifactPreviewSessionId',
		'artifactPreviewOpen',
		'artifactPreviewChatTarget',
		'artifactPersistAgent',
		'artifactEditingLocked',
	],
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
		threadState.activeArtifactId = undefined;
		threadState.isSendingMessage = false;
		threadState.isStreaming = false;
		updateThreadMetadataMock.mockClear();
		persistPendingAgentMock.mockReset();
	});

	it('forwards preview dock state and Assistant handoffs from Agent Builder', async () => {
		const previewChatTarget = document.createElement('div');
		const wrapper = mount(InstanceAiAgentPreview, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				previewSessionId: 'preview-session-1',
				previewOpen: true,
				previewChatTarget,
			},
			global: {
				stubs: { AgentBuilderView: AgentBuilderViewStub },
			},
		});

		const builder = wrapper.findComponent({ name: 'AgentBuilderView' });
		expect(builder.props('artifactPreviewSessionId')).toBe('preview-session-1');
		expect(builder.props('artifactPreviewOpen')).toBe(true);
		expect(builder.props('artifactPreviewChatTarget')).toBe(previewChatTarget);
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

	it('shows activity from sending through agent changes and only locks editing for changes', async () => {
		threadState.activeArtifactId = 'agent-1';
		threadState.isSendingMessage = true;

		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1', previewOpen: false },
			global: { stubs: { AgentBuilderView: AgentBuilderViewStub } },
		});

		expect(wrapper.find('[data-test-id="instance-ai-agent-building-indicator"]').exists()).toBe(
			true,
		);
		expect(wrapper.findComponent({ name: 'AgentBuilderView' }).props('artifactEditingLocked')).toBe(
			false,
		);
		threadState.isSendingMessage = false;
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-test-id="instance-ai-agent-building-indicator"]').exists()).toBe(
			false,
		);

		threadState.messages = [makeBuildingMessage('agent-1')];
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-test-id="instance-ai-agent-building-indicator"]').exists()).toBe(
			true,
		);
		expect(wrapper.findComponent({ name: 'AgentBuilderView' }).props('artifactEditingLocked')).toBe(
			true,
		);
	});

	it('hides the building indicator when the AI is working on a different agent', () => {
		threadState.messages = [makeBuildingMessage('agent-other')];
		threadState.activeArtifactId = 'agent-other';
		threadState.isSendingMessage = true;

		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1', previewOpen: false },
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
				previewOpen: false,
			},
			global: {
				stubs: {
					AgentBuilderView: AgentBuilderViewStub,
				},
			},
		});
		const builder = wrapper.findComponent({ name: 'AgentBuilderView' });

		const persist = builder.props('artifactPersistAgent') as (
			request: Parameters<typeof persistPendingAgent>[2],
		) => Promise<AgentCreationResource>;
		const config = { name: 'Support Agent', model: '', instructions: 'Help users' };
		await expect(
			persist({ projectId: 'project-1', agentId: 'agent-1', name: 'Support Agent', config }),
		).resolves.toBe(persistedAgent);
		await flushPromises();

		expect(persistPendingAgentMock).toHaveBeenCalledWith(expect.anything(), 'thread-1', {
			projectId: 'project-1',
			agentId: 'agent-1',
			name: 'Support Agent',
			config,
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

	it('persists the supplied target after the preview switches to another pending agent', async () => {
		const target = {
			projectId: 'project-1',
			agentId: 'agent-1',
			name: 'Support Agent',
		};
		const request = {
			...target,
			config: { name: 'Support Agent', model: '', instructions: 'Help users' },
		};
		persistPendingAgentMock.mockResolvedValue({
			agent: persistedAgent,
			thread: { metadata: { instanceAiAgentBuilderTarget: target } },
		});
		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1', pending: true, previewOpen: false },
			global: { stubs: { AgentBuilderView: AgentBuilderViewStub } },
		});
		const persist = wrapper
			.findComponent({ name: 'AgentBuilderView' })
			.props('artifactPersistAgent') as (
			request: Parameters<typeof persistPendingAgent>[2],
		) => Promise<AgentCreationResource>;

		await wrapper.setProps({ agentId: 'agent-2' });
		metadataState.value = {
			instanceAiPendingAgentTarget: { projectId: 'project-1', agentId: 'agent-2' },
		};
		await persist(request);

		expect(persistPendingAgentMock).toHaveBeenCalledWith(expect.anything(), 'thread-1', request);
		expect(getPendingAgentTargetFromThreadMetadata(metadataState.value)).toEqual({
			projectId: 'project-1',
			agentId: 'agent-2',
		});
		wrapper.unmount();
	});
});
