/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import type { AgentResource } from '../types';

const ensureLoadedMock = vi.fn();
const projectAgentsListRef = ref<AgentResource[] | null>([]);
const openModalWithDataMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.memory.episodicMemory.label': 'Episodic Memory',
				'agents.builder.memory.episodicMemory.hint':
					'Stores source-backed memories from previous conversations. Requires OpenAI credential.',
				'agents.builder.memory.episodicMemory.changeCredential': 'Change credential',
				'agents.builder.editorColumn.ariaLabel': 'Agent editor',
				'agents.builder.subAgents.title': 'Sub-agents',
				'agents.builder.subAgents.description': 'Sub-agents description',
				'agents.builder.subAgents.add': 'Add agent',
				'agents.builder.subAgents.loadError': 'Could not load project agents',
				'agents.builder.subAgents.remove': 'Remove {name}',
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

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return { ...actual, useRoute: () => ({ params: {} }) };
});

vi.mock('@n8n/design-system', () => ({
	N8nActionBox: { template: '<div />', props: ['icon', 'description'] },
	N8nButton: { template: '<button><slot /><slot name="icon" /></button>' },
	N8nCard: { template: '<div><slot /></div>', props: ['variant'] },
	N8nHeading: { template: '<h2><slot /></h2>', props: ['size'] },
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
	N8nIconButton: {
		template: '<button><slot /></button>',
		props: ['disabled', 'ariaLabel'],
	},
	N8nLoading: { template: '<div />', props: ['rows', 'variant'] },
	N8nRadioButtons: { template: '<div />', props: ['modelValue', 'options'] },
	N8nScrollArea: { template: '<div><slot /></div>', props: ['maxHeight', 'type'] },
	N8nSwitch: { template: '<button data-test-id="agent-memory-toggle"></button>' },
	N8nSwitch2: { template: '<button />', props: ['modelValue', 'disabled'] },
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

vi.mock('@n8n/design-system/components/N8nSelect', () => ({
	default: { template: '<div><slot /></div>', props: ['modelValue', 'disabled', 'size'] },
}));

vi.mock('@n8n/design-system/components/N8nOption', () => ({
	default: { template: '<div />', props: ['value', 'label', 'disabled'] },
}));

vi.mock('../components/AgentAdvancedPanel.vue', () => ({
	default: { name: 'AgentAdvancedPanel', template: '<div />' },
}));

vi.mock('../components/AgentCapabilitiesSection.vue', () => ({
	default: { name: 'AgentCapabilitiesSection', template: '<div />' },
}));

vi.mock('../components/AgentIdentityHeader.vue', () => ({
	default: { name: 'AgentIdentityHeader', template: '<div />' },
}));

vi.mock('../components/AgentInfoPanel.vue', () => ({
	default: { name: 'AgentInfoPanel', template: '<div />' },
}));

vi.mock('../components/AgentJsonEditor.vue', () => ({
	default: { name: 'AgentJsonEditor', template: '<div />' },
}));

vi.mock('../components/AgentPanelHeader.vue', () => ({
	default: { name: 'AgentPanelHeader', template: '<div />' },
}));

vi.mock('../views/AgentSessionsListView.vue', () => ({
	default: { name: 'AgentSessionsListView', template: '<div />' },
}));

// First mount of this SFC eats the Vite transform cost; give it headroom.
vi.setConfig({ testTimeout: 30_000 });

const publishedSubAgent: AgentResource = {
	id: 'agent-2',
	name: 'Helper Agent',
	description: 'Helps with tasks',
	activeVersionId: 'version-2',
} as AgentResource;

async function mountColumn() {
	const { default: AgentBuilderEditorColumn } = await import(
		'../components/AgentBuilderEditorColumn.vue'
	);
	return mount(AgentBuilderEditorColumn, {
		props: {
			activeMainTab: 'agent',
			mainTabOptions: [{ label: 'Agent', value: 'agent' }],
			localConfig: {
				name: 'Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				memory: { enabled: true, storage: 'n8n' },
			},
			agent: null,
			projectId: 'project-1',
			agentId: 'agent-1',
			agentFiles: [],
			agentFilesLoading: false,
			agentFilesUploading: false,
			appliedSkills: [],
			connectedTriggers: [],
			isBuildChatStreaming: false,
			canEditAgent: true,
			executionsDescription: '',
		},
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
			stubs: {
				AgentCapabilitiesSection: true,
				AgentIdentityHeader: true,
				AgentInfoPanel: true,
				AgentPanelHeader: true,
				AgentAdvancedPanel: true,
				AgentSessionsListView: true,
			},
		},
	});
}

describe('AgentBuilderEditorColumn', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		projectAgentsListRef.value = [];
		ensureLoadedMock.mockResolvedValue([]);
	});

	it('always renders the agent files card on the agent tab', async () => {
		const wrapper = await mountColumn();

		expect(wrapper.find('[data-testid="agent-files-card"]').exists()).toBe(true);
	});

	it('renders only the episodic memory row in the builder memory card', async () => {
		const wrapper = await mountColumn();

		expect(wrapper.text()).toContain('Episodic Memory');
		expect(wrapper.text()).toContain(
			'Stores source-backed memories from previous conversations. Requires OpenAI credential.',
		);
		expect(wrapper.find('[data-testid="agent-episodic-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-observational-memory-toggle"]').exists()).toBe(false);
	});

	it('preloads project agents on mount without surfacing rejection', async () => {
		const loadError = new Error('boom');
		ensureLoadedMock.mockRejectedValueOnce(loadError);

		await mountColumn();
		await flushPromises();

		expect(ensureLoadedMock).toHaveBeenCalledTimes(1);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('opens the sub-agents modal after project agents load successfully', async () => {
		projectAgentsListRef.value = [publishedSubAgent];
		const wrapper = await mountColumn();
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
		const wrapper = await mountColumn();
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
});
