import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentResource } from '@/features/agents/types';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
} from '../instanceAi.threadRuntime';

const threadState = {
	id: 'thread-1',
	messages: [],
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
	}),
}));

const persistedAgent = {
	id: 'agent-1',
	name: 'Support Agent',
} as AgentResource;

const AgentBuilderViewStub = {
	name: 'AgentBuilderView',
	emits: ['persisted', 'name-saved', 'preview-open-change'],
	template: '<div />',
};

describe('InstanceAiAgentPreview', () => {
	beforeEach(() => {
		metadataState.value = {
			instanceAiPendingAgentTarget: {
				agentId: 'agent-1',
				projectId: 'project-1',
			},
		};
		updateThreadMetadataMock.mockClear();
	});

	it('forwards preview dock state changes from Agent Builder', async () => {
		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1' },
			global: {
				stubs: { AgentBuilderView: AgentBuilderViewStub },
			},
		});

		wrapper.findComponent({ name: 'AgentBuilderView' }).vm.$emit('preview-open-change', true);
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('preview-open-change')).toEqual([[true]]);
	});

	it('keeps the bound thread target in sync across persistence and renames', async () => {
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

		builder.vm.$emit('persisted', persistedAgent);
		await flushPromises();

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
