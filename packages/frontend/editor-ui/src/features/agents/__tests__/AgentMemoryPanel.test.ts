/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import type { AgentJsonConfig } from '../types';

const { openModalWithDataMock } = vi.hoisted(() => ({
	openModalWithDataMock: vi.fn(),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.memory.title': 'Memory',
				'agents.builder.memory.description':
					'Stores useful context from conversations so the agent can respond with more continuity.',
				'agents.builder.memory.episodicMemory.label': 'Episodic memory',
				'agents.builder.memory.episodicMemory.hint':
					'Keep useful details from past conversations so they can help later.',
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nSwitch: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataMock }),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'A',
		instructions: 'i',
		model: 'anthropic/claude-sonnet-4-6',
		credential: 'c',
		...overrides,
	} as AgentJsonConfig;
}

function mountPanel(
	props: Partial<{
		config: AgentJsonConfig | null;
		disabled: boolean;
	}> = {},
) {
	return mount(AgentMemoryPanel, {
		props: {
			config: makeConfig(),
			...props,
		},
	});
}

describe('AgentMemoryPanel', () => {
	beforeEach(() => {
		openModalWithDataMock.mockClear();
	});

	it('renders memory and episodic memory controls', () => {
		const wrapper = mountPanel();

		expect(wrapper.find('[data-testid="agent-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-episodic-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Memory');
		expect(wrapper.text()).toContain('Episodic memory');
		expect(wrapper.text()).not.toContain('User profile');
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').exists()).toBe(false);
	});

	it('enables base memory without opening credential selection', async () => {
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-toggle"]').trigger('click');

		expect(openModalWithDataMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'n8n',
						lastMessages: 10,
					},
				},
			],
		]);
	});

	it('opens the credential modal without updating config when episodic memory is toggled on', async () => {
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(openModalWithDataMock).toHaveBeenCalledWith({
			name: 'agentEpisodicMemoryCredentialModal',
			data: expect.objectContaining({
				initialValue: null,
				onSelect: expect.any(Function),
			}),
		});
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('emits the memory config after a credential is selected', async () => {
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');
		const payload = openModalWithDataMock.mock.calls[0][0] as {
			data: { onSelect: (credentialId: string) => void };
		};
		payload.data.onSelect('credential-1');

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'n8n',
						lastMessages: 10,
						episodicMemory: {
							enabled: true,
							credential: 'credential-1',
						},
					},
				},
			],
		]);
	});

	it('preserves existing memory config when enabling episodic memory', async () => {
		const wrapper = mountPanel({
			config: makeConfig({
				memory: {
					enabled: true,
					storage: 'n8n',
					lastMessages: 4,
					semanticRecall: {
						topK: 3,
						scope: 'resource',
					},
				},
			}),
		});

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');
		const payload = openModalWithDataMock.mock.calls[0][0] as {
			data: { onSelect: (credentialId: string) => void };
		};
		payload.data.onSelect('credential-2');

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
				episodicMemory: {
					enabled: true,
					credential: 'credential-2',
				},
			},
		});
	});

	it('emits disabled episodic memory config when episodic memory is toggled off', async () => {
		const wrapper = mountPanel({
			config: makeConfig({
				memory: {
					enabled: true,
					storage: 'n8n',
					lastMessages: 10,
					episodicMemory: {
						enabled: true,
						credential: 'credential-1',
					},
				},
			}),
		});

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(openModalWithDataMock).not.toHaveBeenCalled();
		const events = wrapper.emitted('update:config') ?? [];
		expect(events[0][0]).toEqual({
			memory: {
				enabled: true,
				storage: 'n8n',
				lastMessages: 10,
				episodicMemory: { enabled: false },
			},
		});
	});

	it('disables memory controls when the disabled prop is true', () => {
		const wrapper = mountPanel({ disabled: true });

		expect(
			wrapper.find('[data-testid="agent-memory-toggle"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-episodic-memory-toggle"]').attributes('disabled'),
		).toBeDefined();
	});
});
