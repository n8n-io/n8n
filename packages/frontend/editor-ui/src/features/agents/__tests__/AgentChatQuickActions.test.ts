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

describe('AgentChatQuickActions', () => {
	beforeEach(() => openModalWithData.mockClear());

	it('renders three chips: Run now, Edit config, Add tool', () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: { tools: [] as AgentJsonToolRef[], projectId: 'p1', agentId: 'a1' },
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-quick-action-run"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-quick-action-edit"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-quick-action-add-tool"]').exists()).toBe(true);
	});

	it('Add tool opens the AgentToolsModal with current tools and ids', async () => {
		const tools = [{ type: 'node', name: 'x' } as unknown as AgentJsonToolRef];
		const wrapper = mount(AgentChatQuickActions, {
			props: { tools, projectId: 'p1', agentId: 'a1' },
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

	it('emits update:tools when the modal confirms a selection', async () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: { tools: [] as AgentJsonToolRef[], projectId: 'p1', agentId: 'a1' },
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-quick-action-add-tool"]').trigger('click');
		const { onConfirm } = openModalWithData.mock.calls[0][0].data;
		const next = [{ type: 'node', name: 'y' } as unknown as AgentJsonToolRef];
		onConfirm(next);
		expect(wrapper.emitted('update:tools')?.[0]).toEqual([next]);
	});

	it('Run now and Edit config render as disabled, Add tool is enabled', () => {
		const wrapper = mount(AgentChatQuickActions, {
			props: { tools: [] as AgentJsonToolRef[], projectId: 'p1', agentId: 'a1' },
			global: { stubs: globalStubs },
		});
		expect(
			wrapper.find('[data-testid="agent-quick-action-run"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-quick-action-edit"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-quick-action-add-tool"]').attributes('disabled'),
		).toBeUndefined();
	});
});
