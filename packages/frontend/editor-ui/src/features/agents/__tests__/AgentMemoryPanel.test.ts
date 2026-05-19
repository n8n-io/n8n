import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import type { AgentJsonConfig } from '../types';

const openModalWithDataMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: openModalWithDataMock,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nSwitch: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template: '<button v-bind="$attrs" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	N8nButton: { template: '<button v-bind="$attrs"><slot /></button>', props: ['variant', 'size'] },
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
}));

describe('AgentMemoryPanel', () => {
	beforeEach(() => {
		openModalWithDataMock.mockReset();
	});

	it('preserves episodic memory tuning when selecting a different credential', async () => {
		const config = {
			name: 'Agent',
			model: 'openai/gpt-5.5',
			instructions: 'Help the user.',
			credential: 'agent-credential',
			memory: {
				enabled: true,
				storage: 'n8n',
				lastMessages: 10,
				episodicMemory: {
					enabled: true,
					credential: 'old-credential',
					topK: 7,
					halfLifeDays: 90,
					maxEntriesPerRun: 8,
					maxEntryLength: 1200,
				},
			},
		} satisfies AgentJsonConfig;

		const wrapper = mount(AgentMemoryPanel, {
			props: { config },
		});

		await wrapper.get('[data-testid="agent-episodic-memory-change-credential"]').trigger('click');

		const [{ data }] = openModalWithDataMock.mock.calls[0];
		data.onSelect('new-credential');

		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: {
				episodicMemory: {
					enabled: true,
					credential: 'new-credential',
					topK: 7,
					halfLifeDays: 90,
					maxEntriesPerRun: 8,
					maxEntryLength: 1200,
				},
			},
		});
	});

	it('disables episodic memory when the enabled switch is turned off', async () => {
		const config = {
			name: 'Agent',
			model: 'openai/gpt-5.5',
			instructions: 'Help the user.',
			credential: 'agent-credential',
			memory: {
				enabled: true,
				storage: 'n8n',
				lastMessages: 10,
				episodicMemory: {
					enabled: true,
					credential: 'old-credential',
					topK: 7,
				},
			},
		} satisfies AgentJsonConfig;

		const wrapper = mount(AgentMemoryPanel, {
			props: { config },
		});

		await wrapper.get('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(openModalWithDataMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: {
				enabled: true,
				episodicMemory: { enabled: false },
			},
		});
	});
});
