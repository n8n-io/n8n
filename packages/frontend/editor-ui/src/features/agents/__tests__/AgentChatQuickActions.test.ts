/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentChatQuickActions from '../components/AgentChatQuickActions.vue';
import type { AgentJsonToolRef } from '../types';

const openModalWithData = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

const globalStubs = {
	N8nButton: {
		props: ['type', 'size', 'disabled'],
		template:
			'<button v-bind="$attrs" :disabled="disabled !== false && disabled !== undefined ? true : undefined" @click="$emit(\'click\', $event)"><slot name="prefix" /><slot /></button>',
		emits: ['click'],
		inheritAttrs: false,
	},
	N8nIcon: { template: '<i></i>' },
};

const defaultProps = {
	tools: [] as AgentJsonToolRef[],
	projectId: 'p1',
	agentId: 'a1',
	agentName: 'My Agent',
	isPublished: true,
	connectedTriggers: [] as string[],
};

describe('AgentChatQuickActions', () => {
	beforeEach(() => openModalWithData.mockClear());

	it('renders Add tool and Add trigger chips', () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-quick-action-add-tool"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-quick-action-add-trigger"]').exists()).toBe(true);
	});

	it('does not render Run now or Edit config chips', () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-quick-action-run"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-quick-action-edit"]').exists()).toBe(false);
	});

	it('Add tool is enabled', () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		expect(
			wrapper.find('[data-testid="agent-quick-action-add-tool"]').attributes('disabled'),
		).toBeUndefined();
	});

	it('Add trigger is enabled', () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		expect(
			wrapper.find('[data-testid="agent-quick-action-add-trigger"]').attributes('disabled'),
		).toBeUndefined();
	});

	it('Add tool opens the AgentToolsModal with current tools and ids', async () => {
		const tools = [{ type: 'node', name: 'x' } as unknown as AgentJsonToolRef];
		const wrapper = mount(AgentChatQuickActions, {
			props: { ...defaultProps, tools },
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-quick-action-add-tool"]').trigger('click');
		expect(openModalWithData).toHaveBeenCalledTimes(1);
		const call = openModalWithData.mock.calls[0][0];
		expect(call.name).toBe('agentToolsModal');
		expect(call.data.tools).toEqual(tools);
		expect(call.data.projectId).toBe('p1');
		expect(call.data.agentId).toBe('a1');
		expect(typeof call.data.onConfirm).toBe('function');
	});

	it('emits update:tools when the tools modal confirms a selection', async () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-quick-action-add-tool"]').trigger('click');
		const { onConfirm } = openModalWithData.mock.calls[0][0].data;
		const next = [{ type: 'node', name: 'y' } as unknown as AgentJsonToolRef];
		onConfirm(next);
		expect(wrapper.emitted('update:tools')?.[0]).toEqual([next]);
	});

	it('Add trigger opens the AgentAddTriggerModal with correct data', async () => {
		const connectedTriggers = ['slack'];
		const wrapper = mount(AgentChatQuickActions, {
			props: { ...defaultProps, connectedTriggers },
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-quick-action-add-trigger"]').trigger('click');
		expect(openModalWithData).toHaveBeenCalledTimes(1);
		const call = openModalWithData.mock.calls[0][0];
		expect(call.name).toBe('agentAddTriggerModal');
		expect(call.data.projectId).toBe('p1');
		expect(call.data.agentId).toBe('a1');
		expect(call.data.isPublished).toBe(true);
		expect(call.data.connectedTriggers).toEqual(connectedTriggers);
		expect(typeof call.data.onConnectedTriggersChange).toBe('function');
		expect(typeof call.data.onTriggerAdded).toBe('function');
	});

	it('emits update:connected-triggers via the modal onConnectedTriggersChange callback', async () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-quick-action-add-trigger"]').trigger('click');
		const { onConnectedTriggersChange } = openModalWithData.mock.calls[0][0].data;
		onConnectedTriggersChange(['telegram']);
		expect(wrapper.emitted('update:connected-triggers')?.[0]).toEqual([['telegram']]);
	});

	it('emits trigger-added via the modal onTriggerAdded callback', async () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: defaultProps,
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-quick-action-add-trigger"]').trigger('click');
		const { onTriggerAdded } = openModalWithData.mock.calls[0][0].data;
		const payload = { triggerType: 'slack', triggers: ['slack'] };
		onTriggerAdded(payload);
		expect(wrapper.emitted('trigger-added')?.[0]).toEqual([payload]);
	});
});
