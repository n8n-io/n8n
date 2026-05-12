/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import { getAgentMemoryProfiles } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';

const restApiContext = {};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.memory.title': 'Memory',
				'agents.builder.memory.description':
					'Keeps session context and learned behavior available.',
				'agents.builder.memory.profiles.title': 'User profile',
				'agents.builder.memory.profiles.userProfile.description':
					'What the agent remembers about you.',
				'agents.builder.memory.profiles.userProfile.empty': 'No user profile has been saved yet.',
				'agents.builder.memory.profiles.loading': 'Loading user profile...',
				'agents.builder.memory.profiles.error': "Couldn't load user profile.",
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nCollapsiblePanel: {
		props: ['modelValue', 'title', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<section v-bind="$attrs"><button data-testid="agent-memory-profiles-toggle" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)">{{ title }}</button><div v-if="modelValue"><slot /></div></section>',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nSwitch: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentMemoryProfiles: vi.fn(),
}));

const globalStubs = {
	AgentMiniEditor: {
		props: ['modelValue', 'language', 'readonly', 'minHeight', 'maxHeight'],
		template: '<pre v-bind="$attrs">{{ modelValue }}</pre>',
	},
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

const getAgentMemoryProfilesMock = vi.mocked(getAgentMemoryProfiles);

function mountPanel(
	props: Partial<{
		config: AgentJsonConfig | null;
		projectId: string;
		agentId: string;
		disabled: boolean;
	}> = {},
) {
	return mount(AgentMemoryPanel, {
		props: {
			config: makeConfig(),
			projectId: 'project-1',
			agentId: 'agent-1',
			...props,
		},
		global: { stubs: globalStubs },
	});
}

describe('AgentMemoryPanel', () => {
	beforeEach(() => {
		getAgentMemoryProfilesMock.mockReset();
	});

	it('renders the memory toggle', () => {
		const wrapper = mountPanel();

		expect(wrapper.find('[data-testid="agent-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-memory-profiles-panel"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Memory');
		expect(wrapper.text()).toContain('Keeps session context and learned behavior available.');
		expect(wrapper.text()).toContain('User profile');
		expect(getAgentMemoryProfilesMock).not.toHaveBeenCalled();
	});

	it('renders the user profile section below the memory toggle', () => {
		const wrapper = mountPanel();

		const memoryToggle = wrapper.find('[data-testid="agent-memory-toggle"]');
		const profilesPanel = wrapper.find('[data-testid="agent-memory-profiles-panel"]');

		expect(profilesPanel.exists()).toBe(true);
		expect(
			memoryToggle.element.compareDocumentPosition(profilesPanel.element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('enables base memory', async () => {
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-toggle"]').trigger('click');

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

	it('preserves existing memory config when enabling memory', async () => {
		const wrapper = mountPanel({
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
			},
		});
	});

	it('emits disabled memory config when toggled off', async () => {
		const wrapper = mountPanel({
			config: makeConfig({
				memory: {
					enabled: true,
					storage: 'n8n',
					lastMessages: 10,
				},
			}),
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
		const wrapper = mountPanel({ disabled: true });

		expect(
			wrapper.find('[data-testid="agent-memory-toggle"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-memory-profiles-toggle"]').attributes('disabled'),
		).toBeDefined();
	});

	it('expands the user profile section and displays loaded profile content', async () => {
		getAgentMemoryProfilesMock.mockResolvedValue({
			userProfile: 'The user works on self-hosted n8n.',
		});
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledWith(restApiContext, 'project-1', 'agent-1');
		expect(wrapper.text()).toContain('User profile');
		expect(wrapper.text()).toContain('What the agent remembers about you.');
		expect(wrapper.find('[data-testid="agent-memory-agent-profile"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'The user works on self-hosted n8n.',
		);
	});

	it('shows empty states for missing profiles', async () => {
		getAgentMemoryProfilesMock.mockResolvedValue({ userProfile: null });
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('No user profile has been saved yet.');
	});

	it('shows an error if profiles cannot load', async () => {
		getAgentMemoryProfilesMock.mockRejectedValue(new Error('failed'));
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain("Couldn't load user profile.");
	});

	it('reloads profile content when the agent id changes while expanded', async () => {
		getAgentMemoryProfilesMock
			.mockResolvedValueOnce({ userProfile: 'Profile for the first agent.' })
			.mockResolvedValueOnce({ userProfile: 'Profile for the second agent.' });
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'Profile for the first agent.',
		);

		await wrapper.setProps({ agentId: 'agent-2' });
		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenLastCalledWith(
			restApiContext,
			'project-1',
			'agent-2',
		);
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'Profile for the second agent.',
		);
	});
});
