import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentToolsPanel from '../components/AgentToolsPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const STUBS = {
	N8nCard: { template: '<div><slot name="header" /><slot /></div>' },
	N8nText: { template: '<span><slot /></span>' },
	N8nButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
	// N8nSwitch2 has no defineOptions name, Vue infers it as 'Switch' from filename
	Switch: {
		name: 'Switch',
		template:
			'<input type="checkbox" data-testid="node-tools-toggle" :checked="modelValue" @change="$emit(\'update:modelValue\', !modelValue)" />',
		props: ['modelValue', 'size', 'disabled'],
		emits: ['update:modelValue'],
	},
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Test',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Be helpful',
		...overrides,
	};
}

describe('AgentToolsPanel — built-in node tools toggle', () => {
	it('shows the toggle as off when config has no nodeTools field', () => {
		const wrapper = mount(AgentToolsPanel, {
			props: { config: makeConfig(), agentTools: {} },
			global: { stubs: STUBS },
		});

		const toggle = wrapper.get('[data-testid="node-tools-toggle"]');
		expect((toggle.element as HTMLInputElement).checked).toBe(false);
	});

	it('shows the toggle as on when config.nodeTools.enabled is true', () => {
		const wrapper = mount(AgentToolsPanel, {
			props: {
				config: makeConfig({ config: { nodeTools: { enabled: true } } }),
				agentTools: {},
			},
			global: { stubs: STUBS },
		});

		expect(
			(wrapper.get('[data-testid="node-tools-toggle"]').element as HTMLInputElement).checked,
		).toBe(true);
	});

	it('shows the toggle as off when config.nodeTools.enabled is false', () => {
		const wrapper = mount(AgentToolsPanel, {
			props: {
				config: makeConfig({ config: { nodeTools: { enabled: false } } }),
				agentTools: {},
			},
			global: { stubs: STUBS },
		});

		expect(
			(wrapper.get('[data-testid="node-tools-toggle"]').element as HTMLInputElement).checked,
		).toBe(false);
	});

	it('emits update:config with merged nodeTools.enabled when flipped on', async () => {
		const wrapper = mount(AgentToolsPanel, {
			props: {
				config: makeConfig({
					config: { toolCallConcurrency: 4 },
				}),
				agentTools: {},
			},
			global: { stubs: STUBS },
		});

		await wrapper.get('[data-testid="node-tools-toggle"]').trigger('change');

		const events = wrapper.emitted('update:config');
		expect(events).toHaveLength(1);
		expect(events![0][0]).toEqual({
			config: {
				toolCallConcurrency: 4,
				nodeTools: { enabled: true },
			},
		});
	});

	it('emits update:config with nodeTools.enabled: false when flipped back off', async () => {
		const wrapper = mount(AgentToolsPanel, {
			props: {
				config: makeConfig({ config: { nodeTools: { enabled: true } } }),
				agentTools: {},
			},
			global: { stubs: STUBS },
		});

		await wrapper.get('[data-testid="node-tools-toggle"]').trigger('change');

		const events = wrapper.emitted('update:config');
		expect(events![0][0]).toEqual({
			config: { nodeTools: { enabled: false } },
		});
	});
});
