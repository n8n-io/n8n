/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import { getAgentMemoryProfiles } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';

const { openModalWithDataMock, restApiContext } = vi.hoisted(() => ({
	openModalWithDataMock: vi.fn(),
	restApiContext: {},
}));

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
				'agents.builder.memory.episodicMemory.label': 'Case memory',
				'agents.builder.memory.episodicMemory.hint':
					'Remember source-backed details from previous cases so this agent can recognize similar issues across sessions.',
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
	N8nSwitch: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataMock }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentMemoryProfiles: vi.fn(),
}));

const globalStubs = {
	AgentMiniEditor: {
		props: ['modelValue', 'language', 'readonly', 'minHeight', 'maxHeight'],
		template: '<pre v-bind="$attrs">{{ modelValue }}</pre>',
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
		openModalWithDataMock.mockClear();
	});

	it('renders memory, user profile, and case memory controls', () => {
		const wrapper = mountPanel();

		expect(wrapper.find('[data-testid="agent-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-memory-profiles-panel"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-case-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Memory');
		expect(wrapper.text()).toContain('User profile');
		expect(wrapper.text()).toContain('Case memory');
		expect(getAgentMemoryProfilesMock).not.toHaveBeenCalled();
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

	it('expands the user profile section and displays loaded profile content', async () => {
		getAgentMemoryProfilesMock.mockResolvedValue({
			userProfile: 'The user works on self-hosted n8n.',
		});
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledWith(restApiContext, 'project-1', 'agent-1');
		expect(wrapper.text()).toContain('What the agent remembers about you.');
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'The user works on self-hosted n8n.',
		);
	});

	it('shows empty and error profile states', async () => {
		getAgentMemoryProfilesMock.mockResolvedValueOnce({ userProfile: null });
		const emptyWrapper = mountPanel();

		await emptyWrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();

		expect(emptyWrapper.text()).toContain('No user profile has been saved yet.');

		getAgentMemoryProfilesMock.mockRejectedValueOnce(new Error('failed'));
		const errorWrapper = mountPanel();

		await errorWrapper.find('[data-testid="agent-memory-profiles-toggle"]').trigger('click');
		await flushPromises();

		expect(errorWrapper.text()).toContain("Couldn't load user profile.");
	});

	it('opens the credential modal without updating config when case memory is toggled on', async () => {
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-case-memory-toggle"]').trigger('click');

		expect(openModalWithDataMock).toHaveBeenCalledWith({
			name: 'agentCaseMemoryCredentialModal',
			data: expect.objectContaining({
				initialValue: null,
				onSelect: expect.any(Function),
			}),
		});
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('emits the memory config after a credential is selected', async () => {
		const wrapper = mountPanel();

		await wrapper.find('[data-testid="agent-case-memory-toggle"]').trigger('click');
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

	it('preserves existing memory config when enabling case memory', async () => {
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

		await wrapper.find('[data-testid="agent-case-memory-toggle"]').trigger('click');
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

	it('emits disabled case memory config when case memory is toggled off', async () => {
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

		await wrapper.find('[data-testid="agent-case-memory-toggle"]').trigger('click');

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
			wrapper.find('[data-testid="agent-memory-profiles-toggle"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-case-memory-toggle"]').attributes('disabled'),
		).toBeDefined();
	});
});
