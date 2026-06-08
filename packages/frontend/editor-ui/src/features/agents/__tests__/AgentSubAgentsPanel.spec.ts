/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import {
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_MAX_CHILDREN_MAX,
	SUB_AGENT_MAX_CHILDREN_MIN,
} from '@n8n/api-types';

import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import type { AgentJsonConfig, AgentResource } from '../types';

const ensureLoadedMock = vi.fn();
const projectAgentsListRef = ref<AgentResource[] | null>([]);
const openModalWithDataMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.subAgents.title': 'Sub-agents',
				'agents.builder.subAgents.description': 'Sub-agents description',
				'agents.builder.subAgents.add': 'Add agent',
				'agents.builder.subAgents.loadError': 'Could not load project agents',
				'agents.builder.subAgents.remove': 'Remove {name}',
				'agents.builder.subAgents.maxChildren.label': 'Max parallel sub-agents',
				'agents.builder.subAgents.maxChildren.hint': 'Max children hint',
			})[key] ?? key,
	}),
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: projectAgentsListRef,
		ensureLoaded: ensureLoadedMock,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataMock }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nCard: {
		template: '<div><slot name="prepend" /><slot /><slot name="append" /></div>',
		props: ['variant'],
	},
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
	N8nIconButton: {
		template: '<button><slot /></button>',
		props: ['disabled', 'ariaLabel'],
	},
	N8nInputNumber2: {
		props: ['modelValue', 'disabled', 'min', 'max', 'precision'],
		emits: ['update:modelValue'],
		template:
			'<input :value="modelValue" :disabled="disabled" :min="min" :max="max" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
	},
	N8nScrollArea: { template: '<div><slot /></div>', props: ['maxHeight', 'type'] },
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

const publishedSubAgent: AgentResource = {
	id: 'agent-2',
	name: 'Helper Agent',
	description: 'Helps with tasks',
	activeVersionId: 'version-2',
} as AgentResource;

const defaultConfig: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help the user.',
};

async function mountPanel(config: AgentJsonConfig | null = defaultConfig) {
	const { default: AgentSubAgentsPanel } = await import('../components/AgentSubAgentsPanel.vue');
	return mount(AgentSubAgentsPanel, {
		props: {
			config,
			disabled: false,
			projectId: 'project-1',
			agentId: 'agent-1',
		},
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
		},
	});
}

describe('AgentSubAgentsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		projectAgentsListRef.value = [];
		ensureLoadedMock.mockResolvedValue([]);
	});

	it('preloads project agents on mount without surfacing rejection', async () => {
		const loadError = new Error('boom');
		ensureLoadedMock.mockRejectedValueOnce(loadError);

		await mountPanel();
		await flushPromises();

		expect(ensureLoadedMock).toHaveBeenCalledTimes(1);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('renders the max-children input', async () => {
		const wrapper = await mountPanel();
		expect(wrapper.find('[data-testid="agent-sub-agents-max-children-input"]').exists()).toBe(true);
	});

	it('initialises max-children input to the default when unset in config', async () => {
		const wrapper = await mountPanel();
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		expect(Number(input.element.getAttribute('value'))).toBe(SUB_AGENT_MAX_CHILDREN_DEFAULT);
	});

	it('passes the shared min and max bounds to the max-children input', async () => {
		const wrapper = await mountPanel();
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');

		expect(Number(input.attributes('min'))).toBe(SUB_AGENT_MAX_CHILDREN_MIN);
		expect(Number(input.attributes('max'))).toBe(SUB_AGENT_MAX_CHILDREN_MAX);
	});

	it('initialises max-children input from config', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: { maxChildren: 3, agents: [] },
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		expect(Number(input.element.getAttribute('value'))).toBe(3);
	});

	it('emits update:config with maxChildren while preserving agents', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 2,
				agents: [{ agentId: 'agent-2' }],
			},
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		await input.setValue('4');

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 4,
					agents: [{ agentId: 'agent-2' }],
				},
			},
		]);
	});

	it('removes maxChildren from config when the field is cleared', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: SUB_AGENT_MAX_CHILDREN_DEFAULT,
				agents: [{ agentId: 'agent-2' }],
			},
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		await input.setValue('abc');

		const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.subAgents?.agents).toEqual([{ agentId: 'agent-2' }]);
		expect(last.subAgents).not.toHaveProperty('maxChildren');
	});

	it('opens the sub-agents modal after project agents load successfully', async () => {
		projectAgentsListRef.value = [publishedSubAgent];
		const wrapper = await mountPanel();
		await flushPromises();
		const callsAfterMount = ensureLoadedMock.mock.calls.length;

		await wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').trigger('click');
		await flushPromises();

		expect(ensureLoadedMock.mock.calls.length).toBe(callsAfterMount + 1);
		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: expect.objectContaining({
					agents: [{ id: 'agent-2', name: 'Helper Agent', description: 'Helps with tasks' }],
				}),
			}),
		);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('shows an error toast and does not open the modal when project agents fail to load', async () => {
		const wrapper = await mountPanel();
		await flushPromises();
		const callsAfterMount = ensureLoadedMock.mock.calls.length;

		const loadError = new Error('network');
		ensureLoadedMock.mockRejectedValueOnce(loadError);

		await wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').trigger('click');
		await flushPromises();

		expect(ensureLoadedMock.mock.calls.length).toBe(callsAfterMount + 1);
		expect(showErrorMock).toHaveBeenCalledWith(loadError, 'Could not load project agents');
		expect(openModalWithDataMock).not.toHaveBeenCalled();
	});

	it('emits update:config when the modal confirms added agent IDs', async () => {
		projectAgentsListRef.value = [publishedSubAgent];
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: { maxChildren: 7 },
		});
		await flushPromises();

		await wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').trigger('click');
		await flushPromises();

		const modalCall = openModalWithDataMock.mock.calls[0]?.[0] as {
			data: { onConfirm: (agentIds: string[]) => void };
		};
		modalCall.data.onConfirm(['agent-2']);

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [{ agentId: 'agent-2' }],
				},
			},
		]);
	});

	it('removes a selected sub-agent and preserves the remaining refs and maxChildren', async () => {
		projectAgentsListRef.value = [
			publishedSubAgent,
			{
				id: 'agent-3',
				name: 'Other Agent',
				description: null,
				activeVersionId: 'version-3',
			} as AgentResource,
		];
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 6,
				agents: [{ agentId: 'agent-2' }, { agentId: 'agent-3' }],
			},
		});
		await flushPromises();

		const rows = wrapper.findAll('[data-testid="agent-sub-agent-row"]');
		expect(rows).toHaveLength(2);

		const removeButtons = wrapper.findAll('[data-testid="agent-sub-agent-remove"]');
		expect(removeButtons).toHaveLength(2);
		await removeButtons[0].trigger('click');

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 6,
					agents: [{ agentId: 'agent-3' }],
				},
			},
		]);
	});
});
