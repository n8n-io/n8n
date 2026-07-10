/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.memory.episodicMemory.label': 'Episodic Memory',
				'agents.builder.memory.episodicMemory.hint':
					'Stores source-backed memories from previous conversations. Requires OpenAI credential.',
				'agents.builder.memory.episodicMemory.changeCredential': 'Change credential',
				'agents.builder.editorColumn.ariaLabel': 'Agent editor',
			})[key] ?? key,
	}),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return { ...actual, useRoute: () => ({ params: {} }) };
});

vi.mock('@n8n/design-system', () => ({
	N8nActionBox: { template: '<div />', props: ['icon', 'description'] },
	N8nButton: { template: '<button><slot /><slot name="icon" /></button>' },
	N8nCard: {
		name: 'N8nCard',
		template: '<div v-bind="$attrs"><slot /></div>',
		props: ['hoverable'],
	},
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
	N8nTabs: {
		name: 'N8nTabs',
		template:
			'<nav data-testid="agent-header-tabs"><button v-for="option in options" :key="option.value">{{ option.label }}</button></nav>',
		props: ['modelValue', 'options'],
	},
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
	default: { name: 'AgentIdentityHeader', template: '<div data-testid="agent-identity-header" />' },
}));

vi.mock('../components/AgentInfoPanel.vue', () => ({
	default: {
		name: 'AgentInfoPanel',
		template:
			'<div><div v-if="showModel !== false" data-testid="agent-model-panel" /><div v-if="showInstructions !== false" data-testid="agent-instructions-panel" /></div>',
		props: ['showModel', 'showInstructions', 'showInstructionsToolbar'],
	},
}));

vi.mock('../components/AgentFilesPanel.vue', () => ({
	default: {
		name: 'AgentFilesPanel',
		template: '<div data-testid="agent-files-panel" />',
		props: ['files', 'disabled', 'loading', 'uploading', 'deletingFileId', 'isPublished'],
		emits: ['upload-files', 'delete-file'],
	},
}));

vi.mock('../components/AgentJsonEditor.vue', () => ({
	default: { name: 'AgentJsonEditor', template: '<div />' },
}));

vi.mock('../components/AgentPanelHeader.vue', () => ({
	default: { name: 'AgentPanelHeader', template: '<h3 data-testid="agent-panel-header" />' },
}));

vi.mock('../components/AgentSubAgentsPanel.vue', () => ({
	default: {
		name: 'AgentSubAgentsPanel',
		template: '<div data-testid="agent-sub-agents-panel-stub" />',
		props: ['config', 'disabled', 'projectId', 'agentId'],
		emits: ['update:config'],
	},
}));

vi.mock('../views/AgentSessionsListView.vue', () => ({
	default: {
		name: 'AgentSessionsListView',
		props: ['embedded', 'projectId', 'agentId', 'openSessionInNewTab'],
		template: '<div />',
	},
}));

// First mount of this SFC eats the Vite transform cost; give it headroom.
vi.setConfig({ testTimeout: 30_000 });

async function mountColumn(
	overrides: Partial<{
		activeMainTab: 'agent' | 'knowledge' | 'sessions' | 'settings';
		mainTabOptions: Array<{
			label: string;
			value: 'agent' | 'knowledge' | 'sessions' | 'settings';
		}>;
		knowledgeBaseEnabled: boolean;
	}> = {},
) {
	const { default: AgentBuilderEditorColumn } = await import(
		'../components/AgentBuilderEditorColumn.vue'
	);
	return mount(AgentBuilderEditorColumn, {
		props: {
			activeMainTab: overrides.activeMainTab ?? 'agent',
			mainTabOptions: overrides.mainTabOptions ?? [
				{ label: 'Agent', value: 'agent' },
				{ label: 'Knowledge', value: 'knowledge' },
				{ label: 'Sessions', value: 'sessions' },
				{ label: 'Settings', value: 'settings' },
			],
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
			knowledgeBaseEnabled: overrides.knowledgeBaseEnabled ?? true,
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
				AgentInfoPanel: {
					name: 'AgentInfoPanel',
					template:
						'<div><div v-if="showModel !== false" data-testid="agent-model-panel" /><div v-if="showInstructions !== false" data-testid="agent-instructions-panel" /></div>',
					props: ['showModel', 'showInstructions', 'showInstructionsToolbar'],
				},
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
	});

	it('renders Agent, Knowledge, Sessions, and Settings tabs without Raw', async () => {
		const wrapper = await mountColumn();

		const tabs = wrapper.find('[data-testid="agent-header-tabs"]');
		expect(tabs.text()).toContain('Agent');
		expect(tabs.text()).toContain('Knowledge');
		expect(tabs.text()).toContain('Sessions');
		expect(tabs.text()).toContain('Settings');
		expect(tabs.text()).not.toContain('Raw');
	});

	it('does not render per-tab headings or descriptions for Sessions and Settings', async () => {
		const sessionsWrapper = await mountColumn({ activeMainTab: 'sessions' });
		const settingsWrapper = await mountColumn({ activeMainTab: 'settings' });

		expect(sessionsWrapper.findComponent({ name: 'AgentPanelHeader' }).exists()).toBe(false);
		expect(settingsWrapper.findComponent({ name: 'AgentPanelHeader' }).exists()).toBe(false);
	});

	it.each(['agent', 'knowledge', 'sessions', 'settings'] as const)(
		'renders the agent identity header above the tabs on the %s tab',
		async (activeMainTab) => {
			const wrapper = await mountColumn({ activeMainTab });

			const header = wrapper.find('[data-testid="agent-builder-identity-header"]');
			const tabsRow = wrapper.find('[data-testid="agent-tabs-row"]');

			expect(header.exists()).toBe(true);
			expect(header.find('[data-testid="agent-identity-header"]').exists()).toBe(true);
			expect(tabsRow.find('[data-testid="agent-identity-header"]').exists()).toBe(false);
			expect(
				header.element.compareDocumentPosition(tabsRow.element) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		},
	);

	it('does not render the agent identity header inside the Agent tab content', async () => {
		const wrapper = await mountColumn();

		const agentTabContent = wrapper.find('[data-testid="agent-tab-content"]');

		expect(agentTabContent.exists()).toBe(true);
		expect(agentTabContent.find('[data-testid="agent-identity-header"]').exists()).toBe(false);
	});

	it.each([
		['agent', 'agent-tab-content'],
		['knowledge', 'agent-knowledge-tab-content'],
		['sessions', 'agent-sessions-tab-content'],
		['settings', 'agent-settings-tab-content'],
	] as const)('renders the %s tab through the shared tab panel', async (activeMainTab, testId) => {
		const wrapper = await mountColumn({ activeMainTab });

		const panels = wrapper.findAllComponents({ name: 'AgentBuilderTabPanel' });
		expect(panels).toHaveLength(1);
		expect(panels[0].attributes('data-testid')).toBe(testId);
	});

	it('uses embedded session list spacing inside the Sessions tab panel', async () => {
		const wrapper = await mountColumn({ activeMainTab: 'sessions' });

		expect(wrapper.findComponent({ name: 'AgentSessionsListView' }).props('embedded')).toBe(true);
	});

	it('renders the knowledge files panel only on the Knowledge tab', async () => {
		const agentWrapper = await mountColumn({ activeMainTab: 'agent' });
		const knowledgeWrapper = await mountColumn({ activeMainTab: 'knowledge' });

		expect(agentWrapper.findComponent({ name: 'AgentFilesPanel' }).exists()).toBe(false);
		expect(knowledgeWrapper.findComponent({ name: 'AgentFilesPanel' }).exists()).toBe(true);
	});

	it('renders tabs inside the constrained rule container that aligns with content cards', async () => {
		const wrapper = await mountColumn();

		const tabsRule = wrapper.find('[data-testid="agent-tabs-rule"]');
		expect(tabsRule.exists()).toBe(true);
		expect(tabsRule.find('[data-testid="agent-header-tabs"]').exists()).toBe(true);
	});

	it('uses settings cards without wrapping the Agent tab sections', async () => {
		const agentWrapper = await mountColumn({ knowledgeBaseEnabled: false });
		const settingsWrapper = await mountColumn({ activeMainTab: 'settings' });

		expect(agentWrapper.findAll('[data-testid="agent-settings-card"]')).toHaveLength(0);
		expect(settingsWrapper.findAll('[data-testid="agent-settings-card"]')).toHaveLength(3);
	});

	it('renders only the episodic memory row in the builder memory card', async () => {
		const wrapper = await mountColumn({ activeMainTab: 'settings' });

		expect(wrapper.text()).toContain('Episodic Memory');
		expect(wrapper.text()).toContain(
			'Stores source-backed memories from previous conversations. Requires OpenAI credential.',
		);
		expect(wrapper.find('[data-testid="agent-episodic-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-observational-memory-toggle"]').exists()).toBe(false);
	});

	it('renders runtime settings only on the Settings tab', async () => {
		const wrapper = await mountColumn({ activeMainTab: 'settings' });
		await flushPromises();

		const subAgentsPanel = wrapper.findComponent({ name: 'AgentSubAgentsPanel' });
		expect(subAgentsPanel.exists()).toBe(true);
		expect(subAgentsPanel.props('config')).toMatchObject({
			name: 'Agent',
			model: 'anthropic/claude-sonnet-4-5',
		});
		expect(subAgentsPanel.props('disabled')).toBe(false);
		expect(subAgentsPanel.props('projectId')).toBe('project-1');
		expect(subAgentsPanel.props('agentId')).toBe('agent-1');
		expect(wrapper.findComponent({ name: 'AgentMemoryPanel' }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentAdvancedPanel' }).exists()).toBe(true);
	});

	it('keeps core setup and attached capabilities on the Agent tab', async () => {
		const wrapper = await mountColumn();
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentInfoPanel' }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentSubAgentsPanel' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentMemoryPanel' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentAdvancedPanel' }).exists()).toBe(false);
	});

	it('orders the Agent tab as capabilities, model, then instructions', async () => {
		const wrapper = await mountColumn({ knowledgeBaseEnabled: false });
		await flushPromises();

		const model = wrapper.find('[data-testid="agent-model-panel"]');
		const capabilities = wrapper.findComponent({ name: 'AgentCapabilitiesSection' });
		const instructions = wrapper.find('[data-testid="agent-instructions-panel"]');

		expect(model.exists()).toBe(true);
		expect(capabilities.exists()).toBe(true);
		expect(instructions.exists()).toBe(true);
		expect(
			capabilities.element.compareDocumentPosition(model.element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			model.element.compareDocumentPosition(instructions.element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('shows the instructions toolbar in the main Agent tab', async () => {
		const wrapper = await mountColumn({ knowledgeBaseEnabled: false });
		await flushPromises();

		const instructionsPanel = wrapper
			.findAllComponents({ name: 'AgentInfoPanel' })
			.find((panel) => panel.props('showModel') === false);

		expect(instructionsPanel?.props('showInstructionsToolbar')).toBe(true);
	});
});
