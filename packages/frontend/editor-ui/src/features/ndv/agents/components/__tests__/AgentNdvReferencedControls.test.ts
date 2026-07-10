import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import { N8nSectionHeader } from '@n8n/design-system';

import AgentNdvReferencedControls from '../AgentNdvReferencedControls.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) =>
			opts?.interpolate ? `${key}:${JSON.stringify(opts.interpolate)}` : key,
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
		'toggle-task',
		'update:config',
		'tasks-changed',
		'agent-changed',
	],
	template: '<div data-testid="capabilities-stub" />',
};

const InfoPanelStub = {
	name: 'AgentInfoPanel',
	props: ['config', 'projectId', 'disabled', 'embedded'],
	emits: ['update:config'],
	template: '<div data-testid="info-panel-stub" />',
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		...overrides,
	};
}

function makeAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		id: 'agent-1',
		name: 'Support Agent',
		projectId: 'project-1',
		resourceType: 'agent',
		isCompiled: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		versionId: 'v1',
		activeVersionId: 'v1',
		tools: {},
		skills: {},
		activeVersion: null,
		...overrides,
	} as AgentResource;
}

type NdvOverrides = Partial<{
	isAgentNode: boolean;
	agentId: string;
	projectId: string;
	canUpdate: boolean;
	localConfig: AgentJsonConfig | null;
	agent: AgentResource | null;
	loading: boolean;
	isUnavailable: boolean;
	isPublished: boolean;
	saveStatus: 'idle' | 'saving' | 'saved';
}>;

function createNdvStub(overrides: NdvOverrides = {}) {
	const actions = {
		onOpenAddToolModal: vi.fn(),
		onOpenToolFromList: vi.fn(),
		onRemoveTool: vi.fn(),
		onQuickActionAddTool: vi.fn(),
		onQuickActionAddMcpServers: vi.fn(),
		onOpenAddSkillModal: vi.fn(),
		onOpenSkillFromList: vi.fn(),
		onRemoveSkill: vi.fn(),
		onToggleTask: vi.fn(),
		onConnectedTriggersUpdate: vi.fn(),
		onTriggerAdded: vi.fn(),
		appliedSkills: computed(() => []),
	};
	const scheduleConfigUpdate = vi.fn();
	const onConfigUpdated = vi.fn();
	const openBuilder = vi.fn();

	const value = {
		isAgentNode: computed(() => overrides.isAgentNode ?? true),
		projectId: computed(() => overrides.projectId ?? 'project-1'),
		agentId: computed(() => overrides.agentId ?? 'agent-1'),
		canUpdate: computed(() => overrides.canUpdate ?? true),
		// `in` check so an explicit `null` (loading/empty state) isn't collapsed to the default.
		localConfig: ref('localConfig' in overrides ? overrides.localConfig : makeConfig()),
		agent: ref('agent' in overrides ? overrides.agent : makeAgent()),
		connectedTriggers: ref<string[]>([]),
		loading: ref(overrides.loading ?? false),
		loadError: ref<unknown>(null),
		isUnavailable: ref(overrides.isUnavailable ?? false),
		isPublished: computed(() => overrides.isPublished ?? false),
		saveStatus: ref(overrides.saveStatus ?? 'idle'),
		appliedSkills: actions.appliedSkills,
		actions,
		scheduleConfigUpdate,
		onConfigUpdated,
		reload: vi.fn(),
		flush: vi.fn(),
		settle: vi.fn(),
		openBuilder,
	} as unknown as UseNdvAgentConfigReturn;

	return { value, actions, scheduleConfigUpdate, onConfigUpdated, openBuilder };
}

function mountControls(stub: { value: UseNdvAgentConfigReturn }) {
	return mount(AgentNdvReferencedControls, {
		global: {
			provide: { [NdvAgentConfigKey as symbol]: stub.value },
			stubs: {
				AgentCapabilitiesSection: CapabilitiesStub,
				AgentInfoPanel: InfoPanelStub,
				N8nText: { template: '<span><slot /></span>', props: ['size', 'color'] },
				N8nLoading: { template: '<div data-testid="loading-stub" />', props: ['rows'] },
			},
		},
	});
}

describe('AgentNdvReferencedControls', () => {
	it('renders nothing when the node is not an agent node', () => {
		const stub = createNdvStub({ isAgentNode: false });
		const wrapper = mountControls(stub);
		expect(wrapper.find('[data-test-id="agent-ndv-referenced-controls"]').exists()).toBe(false);
	});

	it('renders nothing when no agent is referenced', () => {
		const stub = createNdvStub({ agentId: '' });
		const wrapper = mountControls(stub);
		expect(wrapper.find('[data-test-id="agent-ndv-referenced-controls"]').exists()).toBe(false);
	});

	it('renders the panels + capabilities with the tools/tasks/skills allowlist', () => {
		const stub = createNdvStub();
		const wrapper = mountControls(stub);

		expect(wrapper.find('[data-testid="info-panel-stub"]').exists()).toBe(true);
		const caps = wrapper.findComponent(CapabilitiesStub);
		expect(caps.exists()).toBe(true);
		expect(caps.props('sections')).toEqual(['tools', 'skills']);
		// Channels are excluded, so no connected-triggers are wired through.
		expect(caps.props('connectedTriggers')).toEqual([]);
	});

	it('renders the "Agent" section header with a divider', () => {
		const stub = createNdvStub();
		const wrapper = mountControls(stub);

		const header = wrapper.findComponent(N8nSectionHeader);
		expect(header.exists()).toBe(true);
		expect(header.props('title')).toBe('agentNode.ndv.section.agent');
		expect(header.props('bordered')).toBe(true);
	});

	it('shows a skeleton while loading with no config yet', () => {
		const stub = createNdvStub({ loading: true, localConfig: null });
		const wrapper = mountControls(stub);
		expect(wrapper.find('[data-test-id="agent-ndv-loading"]').exists()).toBe(true);
		expect(wrapper.findComponent(CapabilitiesStub).exists()).toBe(false);
	});

	it('shows a terminal unavailable message and no controls when the agent is gone', () => {
		const stub = createNdvStub({ isUnavailable: true });
		const wrapper = mountControls(stub);
		expect(wrapper.find('[data-test-id="agent-ndv-unavailable"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="capabilities-stub"]').exists()).toBe(false);
	});

	it('opens the Agent Builder from the header link', async () => {
		const stub = createNdvStub();
		const wrapper = mountControls(stub);

		await wrapper.find('[data-test-id="agent-ndv-edit-in-builder"]').trigger('click');

		expect(stub.openBuilder).toHaveBeenCalled();
	});

	it('hides the builder link in the terminal unavailable state', () => {
		const stub = createNdvStub({ isUnavailable: true });
		const wrapper = mountControls(stub);

		expect(wrapper.find('[data-test-id="agent-ndv-edit-in-builder"]').exists()).toBe(false);
	});

	it('surfaces the save status on the section header row, mirroring the builder header', () => {
		const stub = createNdvStub({ saveStatus: 'saving' });
		const wrapper = mountControls(stub);
		expect(wrapper.find('[data-test-id="agent-ndv-save-status"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('agents.builder.header.saving');
	});

	it('hides the save status while idle', () => {
		const stub = createNdvStub({ saveStatus: 'idle' });
		const wrapper = mountControls(stub);
		expect(wrapper.find('[data-test-id="agent-ndv-save-status"]').exists()).toBe(false);
	});

	it('forwards capability emits to the injected action handlers', () => {
		const stub = createNdvStub();
		const wrapper = mountControls(stub);
		const caps = wrapper.findComponent(CapabilitiesStub);

		caps.vm.$emit('add-tool');
		caps.vm.$emit('open-tool', { kind: 'tool', toolType: 'node', id: 'x' });
		caps.vm.$emit('remove-tool', 2);
		caps.vm.$emit('add-skill');
		caps.vm.$emit('open-skill', 'skill-1');
		caps.vm.$emit('remove-skill', 'skill-1');
		caps.vm.$emit('update:config', { instructions: 'new' });
		caps.vm.$emit('agent-changed');

		expect(stub.actions.onOpenAddToolModal).toHaveBeenCalled();
		expect(stub.actions.onOpenToolFromList).toHaveBeenCalledWith({
			kind: 'tool',
			toolType: 'node',
			id: 'x',
		});
		expect(stub.actions.onRemoveTool).toHaveBeenCalledWith(2);
		expect(stub.actions.onOpenAddSkillModal).toHaveBeenCalled();
		expect(stub.actions.onOpenSkillFromList).toHaveBeenCalledWith('skill-1');
		expect(stub.actions.onRemoveSkill).toHaveBeenCalledWith('skill-1');
		expect(stub.scheduleConfigUpdate).toHaveBeenCalledWith({ instructions: 'new' });
		expect(stub.onConfigUpdated).toHaveBeenCalled();
	});

	it('forwards the info panel update:config to scheduleConfigUpdate', () => {
		const stub = createNdvStub();
		const wrapper = mountControls(stub);
		wrapper.findComponent(InfoPanelStub).vm.$emit('update:config', { model: 'openai/gpt-4' });
		expect(stub.scheduleConfigUpdate).toHaveBeenCalledWith({ model: 'openai/gpt-4' });
	});
});
