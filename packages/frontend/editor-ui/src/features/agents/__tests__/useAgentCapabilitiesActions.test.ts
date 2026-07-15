import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY } from '../constants';
import { useAgentCapabilitiesActions } from '../composables/useAgentCapabilitiesActions';
import type { AgentJsonConfig, AgentJsonMcpServerConfig, AgentResource } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Inline Agent',
		model: 'openai/gpt-5',
		instructions: '',
		tools: [],
		mcpServers: [],
		...overrides,
	};
}

function setup(overrides: { supportsToolApproval?: boolean } = {}) {
	setActivePinia(createTestingPinia({ stubActions: false }));
	const uiStore = useUIStore();

	const localConfig = ref<AgentJsonConfig | null>(makeConfig());
	const scheduleConfigUpdate = vi.fn();

	const actions = useAgentCapabilitiesActions({
		localConfig,
		agent: ref<AgentResource | null>(null),
		projectId: computed(() => 'project-1'),
		agentId: computed(() => 'inline:node-1'),
		connectedTriggers: ref([]),
		scheduleConfigUpdate,
		scheduleSkillSave: vi.fn(),
		...overrides,
	});

	return { uiStore, actions, scheduleConfigUpdate, localConfig };
}

type ToolsModalData = {
	supportsToolApproval?: boolean;
	onConfirm: (payload: {
		tools?: AgentJsonConfig['tools'];
		mcpServers?: AgentJsonMcpServerConfig[];
	}) => void;
};

describe('useAgentCapabilitiesActions — tools modal host seam', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('routes an MCP-server confirm from the tools modal into the config update', () => {
		const { uiStore, actions, scheduleConfigUpdate } = setup();

		actions.onOpenAddToolModal();

		const modalData = uiStore.modalsById[AGENT_TOOLS_MODAL_KEY].data as unknown as ToolsModalData;
		const mcpServer: AgentJsonMcpServerConfig = {
			name: 'github',
			url: 'https://mcp.example.com',
			transport: 'streamableHttp',
			authentication: 'none',
		};
		modalData.onConfirm({ tools: [], mcpServers: [mcpServer] });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ tools: [], mcpServers: [mcpServer] });
	});

	it('forwards the host approval capability into the tools modal data', () => {
		const { uiStore, actions } = setup({ supportsToolApproval: false });

		actions.onOpenAddToolModal();

		const modalData = uiStore.modalsById[AGENT_TOOLS_MODAL_KEY].data as unknown as ToolsModalData;
		expect(modalData.supportsToolApproval).toBe(false);
	});

	it('drops a late confirm when the host identity changed', () => {
		const hostId = ref('inline:node-1');
		setActivePinia(createTestingPinia({ stubActions: false }));
		const uiStore = useUIStore();
		const scheduleConfigUpdate = vi.fn();

		const actions = useAgentCapabilitiesActions({
			localConfig: ref<AgentJsonConfig | null>(makeConfig()),
			agent: ref<AgentResource | null>(null),
			projectId: computed(() => 'project-1'),
			agentId: computed(() => hostId.value),
			connectedTriggers: ref([]),
			scheduleConfigUpdate,
			scheduleSkillSave: vi.fn(),
		});

		actions.onOpenAddToolModal();
		hostId.value = 'inline:node-2';

		const modalData = uiStore.modalsById[AGENT_TOOLS_MODAL_KEY].data as unknown as ToolsModalData;
		modalData.onConfirm({ tools: [], mcpServers: [] });

		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
	});
});
