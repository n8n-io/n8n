/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

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

vi.mock('@n8n/design-system', () => ({
	N8nActionBox: { template: '<div />', props: ['icon', 'description'] },
	N8nCard: { template: '<div><slot /></div>', props: ['variant'] },
	N8nHeading: { template: '<h2><slot /></h2>', props: ['size'] },
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
	N8nIconButton: { template: '<button><slot /></button>' },
	N8nLoading: { template: '<div />', props: ['rows', 'variant'] },
	N8nRadioButtons: { template: '<div />', props: ['modelValue', 'options'] },
	N8nScrollArea: { template: '<div><slot /></div>', props: ['maxHeight', 'type'] },
	N8nSwitch: { template: '<button data-test-id="agent-memory-toggle"></button>' },
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

// First mount of this SFC eats the Vite transform cost; give it headroom.
vi.setConfig({ testTimeout: 30_000 });

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
			knowledgeBaseEnabled: true,
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
	it('renders only the episodic memory row in the builder memory card', async () => {
		const wrapper = await mountColumn();

		expect(wrapper.text()).toContain('Episodic Memory');
		expect(wrapper.text()).toContain(
			'Stores source-backed memories from previous conversations. Requires OpenAI credential.',
		);
		expect(wrapper.find('[data-testid="agent-episodic-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-observational-memory-toggle"]').exists()).toBe(false);
	});
});
