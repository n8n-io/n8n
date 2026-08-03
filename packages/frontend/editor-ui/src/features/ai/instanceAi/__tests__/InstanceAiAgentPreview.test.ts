import { defineComponent, h, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';

const thread = reactive({
	id: 'thread-1',
	messages: [],
});

vi.mock('../instanceAi.store', () => ({
	useThread: () => thread,
	useInstanceAiStore: () => ({ updateThreadMetadata: vi.fn() }),
}));

const AgentBuilderViewStub = defineComponent({
	name: 'AgentBuilderView',
	emits: ['persisted', 'preview-open-change'],
	setup() {
		return () => h('div');
	},
});

describe('InstanceAiAgentPreview', () => {
	it('forwards preview dock state changes from Agent Builder', async () => {
		const wrapper = mount(InstanceAiAgentPreview, {
			props: { projectId: 'project-1', agentId: 'agent-1' },
			global: {
				stubs: { AgentBuilderView: AgentBuilderViewStub },
			},
		});

		wrapper.findComponent(AgentBuilderViewStub).vm.$emit('preview-open-change', true);
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('preview-open-change')).toEqual([[true]]);
	});
});
