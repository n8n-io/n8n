import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref } from 'vue';

import { useAgentCapabilitiesActions } from './useAgentCapabilitiesActions';
import type { AgentJsonConfig, AgentJsonToolConfig, AgentResource } from '../types';

const { openModalWithData } = vi.hoisted(() => ({ openModalWithData: vi.fn() }));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData }),
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: () => null }),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		mcpServers: [],
		...overrides,
	} as AgentJsonConfig;
}

function makeActions() {
	const scheduleConfigUpdate = vi.fn();
	const actions = useAgentCapabilitiesActions({
		localConfig: ref<AgentJsonConfig | null>(makeConfig()),
		agent: ref<AgentResource | null>(null),
		projectId: computed(() => 'proj-1'),
		agentId: computed(() => 'agent-1'),
		connectedTriggers: ref<string[]>([]),
		scheduleConfigUpdate,
		scheduleSkillSave: vi.fn(),
	});
	return { actions, scheduleConfigUpdate };
}

describe('useAgentCapabilitiesActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('schedules array-shaped tools + mcpServers from the add-tools modal confirm payload', () => {
		// Regression guard: the tools modal confirms with a single object payload
		// (`{ tools, mcpServers }`); the modal-data plumbing is untyped, so a
		// positional handler would silently write that object into `config.tools`
		// and fail backend validation on save.
		const { actions, scheduleConfigUpdate } = makeActions();
		actions.onOpenAddToolModal();

		const modalData = openModalWithData.mock.calls[0][0] as {
			data: {
				onConfirm: (payload: {
					tools?: AgentJsonToolConfig[];
					mcpServers?: unknown[];
				}) => void;
			};
		};
		const tools: AgentJsonToolConfig[] = [{ type: 'custom', id: 'tool-1' }];
		modalData.data.onConfirm({ tools, mcpServers: [] });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ tools, mcpServers: [] });
	});

	it('omits keys the add-tools modal did not send instead of wiping them', () => {
		const { actions, scheduleConfigUpdate } = makeActions();
		actions.onOpenAddToolModal();

		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onConfirm: (payload: { tools?: AgentJsonToolConfig[] }) => void };
		};
		const tools: AgentJsonToolConfig[] = [{ type: 'custom', id: 'tool-1' }];
		modalData.data.onConfirm({ tools });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ tools });
	});
});
