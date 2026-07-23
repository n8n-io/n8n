import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { describe, it, expect, vi } from 'vitest';

import AgentNdvInlineControls from '../AgentNdvInlineControls.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentJsonConfig, AgentSkill } from '@/features/agents/types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const CapabilitiesStub = {
	name: 'AgentCapabilitiesSection',
	props: [
		'config',
		'tools',
		'customTools',
		'skills',
		'connectedTriggers',
		'disabled',
		'projectId',
		'agentId',
		'isPublished',
		'taskRefs',
		'reloadKey',
		'sections',
	],
	emits: [
		'add-tool',
		'open-tool',
		'remove-tool',
		'add-skill',
		'open-skill',
		'remove-skill',
		'update:config',
	],
	template: '<div data-testid="capabilities-stub" />',
};

const InfoPanelStub = {
	name: 'AgentInfoPanel',
	props: ['config', 'projectId', 'disabled', 'embedded', 'showInstructions'],
	emits: ['update:config'],
	template: '<div data-testid="info-panel-stub" />',
};

const MarkdownEditorStub = {
	name: 'N8nMarkdownEditor',
	props: ['modelValue', 'disabled'],
	emits: ['update:modelValue'],
	template: '<div data-testid="markdown-editor-stub" />',
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Embedded Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		...overrides,
	};
}

function createNdvStub(
	overrides: Partial<{
		isAgentNode: boolean;
		mode: 'referenced' | 'inline';
		localConfig: AgentJsonConfig | null;
		appliedSkills: Array<{ id: string; skill: AgentSkill }>;
	}> = {},
) {
	const scheduleConfigUpdate = vi.fn();
	const actions = {
		onOpenAddToolModal: vi.fn(),
		onOpenToolFromList: vi.fn(),
		onRemoveTool: vi.fn(),
		onOpenAddSkillModal: vi.fn(),
		onOpenSkillFromList: vi.fn(),
		onRemoveSkill: vi.fn(),
		appliedSkills: computed(() => overrides.appliedSkills ?? []),
	};

	const value = {
		isAgentNode: computed(() => overrides.isAgentNode ?? true),
		mode: computed(() => overrides.mode ?? 'inline'),
		inline: {
			projectId: computed(() => 'project-1'),
			hostId: computed(() => 'inline:node-1'),
			localConfig: ref(overrides.localConfig ?? makeConfig()),
			scheduleConfigUpdate,
			actions,
		},
	} as unknown as UseNdvAgentConfigReturn;

	return { value, scheduleConfigUpdate, actions };
}

function mountControls(ndv: UseNdvAgentConfigReturn, props: { isReadOnly?: boolean } = {}) {
	return mount(AgentNdvInlineControls, {
		props,
		global: {
			provide: { [NdvAgentConfigKey as symbol]: ndv },
			stubs: {
				AgentCapabilitiesSection: CapabilitiesStub,
				AgentInfoPanel: InfoPanelStub,
				MarkdownEditor: MarkdownEditorStub,
			},
		},
	});
}

describe('AgentNdvInlineControls', () => {
	it('renders only for agent nodes in inline mode', () => {
		const inline = mountControls(createNdvStub().value);
		expect(inline.find('[data-test-id="agent-ndv-inline-controls"]').exists()).toBe(true);

		const referenced = mountControls(createNdvStub({ mode: 'referenced' }).value);
		expect(referenced.find('[data-test-id="agent-ndv-inline-controls"]').exists()).toBe(false);

		const nonAgent = mountControls(createNdvStub({ isAgentNode: false }).value);
		expect(nonAgent.find('[data-test-id="agent-ndv-inline-controls"]').exists()).toBe(false);
	});

	it('passes the local config to the panels and enables the tools + skills sections', () => {
		const config = makeConfig();
		const appliedSkills = [
			{ id: 'skill_triage', skill: { name: 'Triage', description: '', instructions: '' } },
		];
		const { value } = createNdvStub({ localConfig: config, appliedSkills });
		const wrapper = mountControls(value);

		const infoPanel = wrapper.findComponent(InfoPanelStub);
		expect(infoPanel.props('config')).toEqual(config);
		expect(infoPanel.props('disabled')).toBe(false);
		expect(infoPanel.props('showInstructions')).toBe(false);

		const markdownEditor = wrapper.findComponent(MarkdownEditorStub);
		expect(markdownEditor.props('modelValue')).toBe(config.instructions);
		expect(markdownEditor.props('disabled')).toBe(false);

		const capabilities = wrapper.findComponent(CapabilitiesStub);
		expect(capabilities.props('sections')).toEqual(['tools', 'skills']);
		expect(capabilities.props('skills')).toEqual(appliedSkills);
	});

	it('routes panel edits and tool actions to the inline adapter', async () => {
		const { value, scheduleConfigUpdate, actions } = createNdvStub();
		const wrapper = mountControls(value);

		wrapper.findComponent(MarkdownEditorStub).vm.$emit('update:modelValue', 'New.');
		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ instructions: 'New.' });

		wrapper.findComponent(CapabilitiesStub).vm.$emit('add-tool');
		expect(actions.onOpenAddToolModal).toHaveBeenCalled();
	});

	it('routes skill actions to the inline adapter', () => {
		const { value, actions } = createNdvStub();
		const wrapper = mountControls(value);

		const capabilities = wrapper.findComponent(CapabilitiesStub);
		capabilities.vm.$emit('add-skill');
		expect(actions.onOpenAddSkillModal).toHaveBeenCalled();

		capabilities.vm.$emit('open-skill', 'skill_triage');
		expect(actions.onOpenSkillFromList).toHaveBeenCalledWith('skill_triage');

		capabilities.vm.$emit('remove-skill', 'skill_triage');
		expect(actions.onRemoveSkill).toHaveBeenCalledWith('skill_triage');
	});

	it('disables editing when the NDV is read-only', () => {
		const wrapper = mountControls(createNdvStub().value, { isReadOnly: true });

		expect(wrapper.findComponent(InfoPanelStub).props('disabled')).toBe(true);
		expect(wrapper.findComponent(MarkdownEditorStub).props('disabled')).toBe(true);
		expect(wrapper.findComponent(CapabilitiesStub).props('disabled')).toBe(true);
	});
});
