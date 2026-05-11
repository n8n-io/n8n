/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentBuilderEditorColumn from '../components/AgentBuilderEditorColumn.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.memory.title': 'Memory',
				'agents.builder.memory.description':
					'Keeps session context and learned behavior available.',
				'agents.builder.editorColumn.ariaLabel': 'Agent editor',
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nCard: { template: '<div><slot /></div>', props: ['variant'] },
	N8nHeading: { template: '<h2><slot /></h2>', props: ['size'] },
	N8nRadioButtons: { template: '<div />', props: ['modelValue', 'options'] },
	N8nSwitch: {
		props: ['modelValue', 'disabled'],
		template: '<button v-bind="$attrs" :disabled="disabled"></button>',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
}));

function mountColumn() {
	return mount(AgentBuilderEditorColumn, {
		props: {
			activeMainTab: 'agent',
			mainTabOptions: [{ label: 'Agent', value: 'agent' }],
			localConfig: {
				name: 'Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				memory: { enabled: true, storage: 'n8n', lastMessages: 10 },
			},
			agent: null,
			projectId: 'project-1',
			agentId: 'agent-1',
			appliedSkills: [],
			connectedTriggers: [],
			isBuildChatStreaming: false,
			executionsDescription: '',
		},
		global: {
			stubs: {
				AgentCapabilitiesSection: true,
				AgentIdentityHeader: true,
				AgentInfoPanel: true,
				AgentPanelHeader: true,
				AgentMemoryPanel: {
					props: ['projectId', 'agentId'],
					template:
						'<div data-testid="agent-memory-panel" :data-project-id="projectId" :data-agent-id="agentId"><button data-testid="agent-memory-toggle" /></div>',
				},
				AgentAdvancedPanel: true,
				AgentSessionsListView: true,
			},
		},
	});
}

describe('AgentBuilderEditorColumn', () => {
	it('renders the memory panel in the builder editor column', () => {
		const wrapper = mountColumn();

		expect(wrapper.find('[data-testid="agent-memory-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-memory-panel"]').attributes()).toMatchObject({
			'data-project-id': 'project-1',
			'data-agent-id': 'agent-1',
		});
	});
});
