import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { describe, it, expect, vi } from 'vitest';

import AgentNdvSettings from '../AgentNdvSettings.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) =>
			opts?.interpolate ? `${key}:${JSON.stringify(opts.interpolate)}` : key,
	}),
}));

const MemoryPanelStub = {
	name: 'AgentMemoryPanel',
	props: ['config', 'disabled', 'embedded'],
	emits: ['update:config'],
	template: '<div data-testid="memory-panel-stub" />',
};

const AdvancedPanelStub = {
	name: 'AgentAdvancedPanel',
	props: ['config', 'disabled', 'collapsible'],
	emits: ['update:config'],
	template: '<div data-testid="advanced-panel-stub" />',
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
	const scheduleConfigUpdate = vi.fn();

	const value = {
		isAgentNode: computed(() => overrides.isAgentNode ?? true),
		projectId: computed(() => overrides.projectId ?? 'project-1'),
		agentId: computed(() => overrides.agentId ?? 'agent-1'),
		canUpdate: computed(() => overrides.canUpdate ?? true),
		// `in` check so an explicit `null` (loading/empty state) isn't collapsed to the default.
		localConfig: ref('localConfig' in overrides ? overrides.localConfig : makeConfig()),
		agent: ref('agent' in overrides ? overrides.agent : makeAgent()),
		connectedTriggers: ref<string[]>([]),
		tasksReloadKey: ref(0),
		loading: ref(overrides.loading ?? false),
		loadError: ref<unknown>(null),
		isUnavailable: ref(overrides.isUnavailable ?? false),
		isPublished: computed(() => overrides.isPublished ?? false),
		saveStatus: ref(overrides.saveStatus ?? 'idle'),
		appliedSkills: computed(() => []),
		actions: {},
		scheduleConfigUpdate,
		onConfigUpdated: vi.fn(),
		reload: vi.fn(),
		flush: vi.fn(),
		settle: vi.fn(),
	} as unknown as UseNdvAgentConfigReturn;

	return { value, scheduleConfigUpdate };
}

function mountSettings(stub: { value: UseNdvAgentConfigReturn }) {
	return mount(AgentNdvSettings, {
		global: {
			provide: { [NdvAgentConfigKey as symbol]: stub.value },
			stubs: {
				AgentMemoryPanel: MemoryPanelStub,
				AgentAdvancedPanel: AdvancedPanelStub,
				N8nCard: { template: '<div><slot /></div>' },
				N8nCallout: {
					template: '<div><slot /><slot name="trailingContent" /></div>',
					props: ['theme'],
				},
				N8nText: { template: '<span><slot /></span>', props: ['size', 'color'] },
				N8nLoading: { template: '<div data-testid="loading-stub" />', props: ['rows'] },
				N8nRoute: {
					template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
					props: ['to'],
				},
			},
		},
	});
}

describe('AgentNdvSettings', () => {
	it('renders nothing when the node is not an agent node', () => {
		const stub = createNdvStub({ isAgentNode: false });
		const wrapper = mountSettings(stub);
		expect(wrapper.find('[data-testid="agent-ndv-settings"]').exists()).toBe(false);
	});

	it('shows the empty hint when no agent is referenced', () => {
		const stub = createNdvStub({ agentId: '' });
		const wrapper = mountSettings(stub);
		expect(wrapper.find('[data-testid="agent-ndv-settings-empty"]').exists()).toBe(true);
		expect(wrapper.findComponent(MemoryPanelStub).exists()).toBe(false);
	});

	it('renders the memory + advanced panels for a referenced agent', () => {
		const stub = createNdvStub();
		const wrapper = mountSettings(stub);

		expect(wrapper.findComponent(MemoryPanelStub).exists()).toBe(true);
		const advanced = wrapper.findComponent(AdvancedPanelStub);
		expect(advanced.exists()).toBe(true);
		expect(advanced.props('collapsible')).toBe(false);
	});

	it('threads the disabled state from canUpdate into both panels', () => {
		const stub = createNdvStub({ canUpdate: false });
		const wrapper = mountSettings(stub);
		expect(wrapper.findComponent(MemoryPanelStub).props('disabled')).toBe(true);
		expect(wrapper.findComponent(AdvancedPanelStub).props('disabled')).toBe(true);
	});

	it('links "Open Agent Builder" to the AGENT_BUILDER_VIEW route', () => {
		const stub = createNdvStub({ projectId: 'p3', agentId: 'a3' });
		const wrapper = mountSettings(stub);
		const link = wrapper.find('[data-test-id="agent-ndv-settings-open-builder"]');
		expect(JSON.parse(link.attributes('data-to') ?? '{}')).toEqual({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'p3', agentId: 'a3' },
		});
	});

	it('shows a skeleton while loading with no config yet', () => {
		const stub = createNdvStub({ loading: true, localConfig: null });
		const wrapper = mountSettings(stub);
		expect(wrapper.find('[data-testid="agent-ndv-settings-loading"]').exists()).toBe(true);
		expect(wrapper.findComponent(MemoryPanelStub).exists()).toBe(false);
	});

	it('shows a terminal unavailable message and no controls when the agent is gone', () => {
		const stub = createNdvStub({ isUnavailable: true });
		const wrapper = mountSettings(stub);
		expect(wrapper.find('[data-testid="agent-ndv-settings-unavailable"]').exists()).toBe(true);
		expect(wrapper.findComponent(MemoryPanelStub).exists()).toBe(false);
	});

	it('forwards panel update:config to scheduleConfigUpdate', () => {
		const stub = createNdvStub();
		const wrapper = mountSettings(stub);

		wrapper.findComponent(MemoryPanelStub).vm.$emit('update:config', { memory: { enabled: true } });
		wrapper
			.findComponent(AdvancedPanelStub)
			.vm.$emit('update:config', { config: { maxIterations: 42 } });

		expect(stub.scheduleConfigUpdate).toHaveBeenCalledWith({ memory: { enabled: true } });
		expect(stub.scheduleConfigUpdate).toHaveBeenCalledWith({ config: { maxIterations: 42 } });
	});
});
