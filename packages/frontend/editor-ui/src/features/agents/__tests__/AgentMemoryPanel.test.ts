/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.memory.title': 'Memory',
				'agents.builder.memory.description':
					'Keeps session context and learned behavior available.',
			})[key] ?? key,
	}),
}));

const globalStubs = {
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nSwitch: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'A',
		instructions: 'i',
		model: 'anthropic/claude-sonnet-4-6',
		credential: 'c',
		...overrides,
	} as AgentJsonConfig;
}

describe('AgentMemoryPanel', () => {
	it('renders the memory toggle', () => {
		const wrapper = mount(AgentMemoryPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});

		expect(wrapper.find('[data-testid="agent-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Memory');
		expect(wrapper.text()).toContain('Keeps session context and learned behavior available.');
	});

	it('enables base memory', async () => {
		const wrapper = mount(AgentMemoryPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});

		await wrapper.find('[data-testid="agent-memory-toggle"]').trigger('click');

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'n8n',
						lastMessages: 10,
						profiles: { enabled: true },
					},
				},
			],
		]);
	});

	it('preserves existing memory config when enabling memory', async () => {
		const wrapper = mount(AgentMemoryPanel, {
			props: {
				config: makeConfig({
					memory: {
						enabled: false,
						storage: 'n8n',
						lastMessages: 4,
						semanticRecall: {
							topK: 3,
							scope: 'resource',
						},
					},
				}),
			},
			global: { stubs: globalStubs },
		});

		await wrapper.find('[data-testid="agent-memory-toggle"]').trigger('click');

		const events = wrapper.emitted('update:config') ?? [];
		expect(events[0][0]).toEqual({
			memory: {
				enabled: true,
				storage: 'n8n',
				lastMessages: 4,
				semanticRecall: {
					topK: 3,
					scope: 'resource',
				},
				profiles: { enabled: true },
			},
		});
	});

	it('emits disabled memory config when toggled off', async () => {
		const wrapper = mount(AgentMemoryPanel, {
			props: {
				config: makeConfig({
					memory: {
						enabled: true,
						storage: 'n8n',
						lastMessages: 10,
					},
				}),
			},
			global: { stubs: globalStubs },
		});

		await wrapper.find('[data-testid="agent-memory-toggle"]').trigger('click');

		const events = wrapper.emitted('update:config') ?? [];
		expect(events[0][0]).toEqual({
			memory: {
				storage: 'n8n',
				enabled: false,
				lastMessages: 10,
			},
		});
	});

	it('disables memory controls when the disabled prop is true', () => {
		const wrapper = mount(AgentMemoryPanel, {
			props: { config: makeConfig(), disabled: true },
			global: { stubs: globalStubs },
		});

		expect(
			wrapper.find('[data-testid="agent-memory-toggle"]').attributes('disabled'),
		).toBeDefined();
	});
});
