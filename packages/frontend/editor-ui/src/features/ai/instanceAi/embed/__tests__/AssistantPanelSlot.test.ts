import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { InstanceAiMcpServerSubject } from '@n8n/api-types';

import AssistantPanelSlot from '../AssistantPanelSlot.vue';

const setPrefill = vi.hoisted(() => vi.fn());

const InstanceAiChatPanelStub = defineComponent({
	name: 'InstanceAiChatPanel',
	props: ['subject', 'launch', 'threadId'],
	emits: ['update:threadId', 'subject-changed', 'close'],
	methods: { setPrefill },
	template: `<div data-test-id="panel-stub" :data-thread-id="threadId">
		<button data-test-id="mint" type="button" @click="$emit('update:threadId', 'thread-2')" />
		<button data-test-id="changed" type="button" @click="$emit('subject-changed')" />
		<button data-test-id="close" type="button" @click="$emit('close')" />
		<slot name="subject" /><slot name="empty" />
	</div>`,
});

const SERVER_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f71';
const subject: InstanceAiMcpServerSubject = {
	type: 'mcpServer',
	id: SERVER_ID,
	projectId: 'project-1',
	name: 'Marketing tools',
};

function mountSlot(props: Record<string, unknown> = {}) {
	return mount(AssistantPanelSlot, {
		props: { subject, ...props },
		slots: {
			subject: '<p data-test-id="subject-row">Marketing tools</p>',
			empty: '<p data-test-id="welcome">Welcome</p>',
		},
		global: { stubs: { InstanceAiChatPanel: InstanceAiChatPanelStub } },
	});
}

describe('AssistantPanelSlot', () => {
	beforeEach(() => {
		setPrefill.mockClear();
	});

	it('opens the panel on the server, from the server page', () => {
		const wrapper = mountSlot();

		const panel = wrapper.getComponent(InstanceAiChatPanelStub);
		expect(panel.props('subject')).toEqual(subject);
		expect(panel.props('launch')).toEqual({
			source: 'mcp_server_page',
			origin: 'internal',
			sourceContext: { serverId: SERVER_ID },
		});
		expect(wrapper.find('[data-test-id="subject-row"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="welcome"]').exists()).toBe(true);
	});

	it('keeps the thread that the panel opens', async () => {
		const wrapper = mountSlot();

		await wrapper.get('[data-test-id="mint"]').trigger('click');

		expect(wrapper.getComponent(InstanceAiChatPanelStub).props('threadId')).toBe('thread-2');
	});

	it('passes on a change of the server and the close', async () => {
		const wrapper = mountSlot();

		await wrapper.get('[data-test-id="changed"]').trigger('click');
		await wrapper.get('[data-test-id="close"]').trigger('click');

		expect(wrapper.emitted('subject-changed')).toHaveLength(1);
		expect(wrapper.emitted('close')).toHaveLength(1);
	});

	it('puts each new pre-fill of the host in the composer', async () => {
		const first = {
			text: 'Build out the server.',
			prefillType: 'mcp_server_build_prompt' as const,
		};
		const wrapper = mountSlot({ prefill: first });
		await flushPromises();

		expect(setPrefill).toHaveBeenCalledWith(first);

		const second = { text: 'Add the workflows.', prefillType: 'mcp_server_suggestion' as const };
		await wrapper.setProps({ prefill: second });

		expect(setPrefill).toHaveBeenLastCalledWith(second);
		expect(setPrefill).toHaveBeenCalledTimes(2);
	});
});
