import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useUIStore } from '@/app/stores/ui.store';
import { NODE_CREATOR_OPEN_SOURCES, VIEWS } from '@/app/constants';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import type { AgentResource } from '@/features/agents/types';
import { useBuildManually } from './useBuildManually';

const { push, route, createAgent, upsertProjectAgentsListCache, track, showError } = vi.hoisted(
	() => ({
		push: vi.fn(),
		route: { query: {} as Record<string, string> },
		createAgent: vi.fn(),
		upsertProjectAgentsListCache: vi.fn(),
		track: vi.fn(),
		showError: vi.fn(),
	}),
);

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => route,
}));
vi.mock('@/features/agents/composables/useAgentApi', () => ({ createAgent }));
vi.mock('@/features/agents/composables/useProjectAgentsList', () => ({
	upsertProjectAgentsListCache,
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const agent = { id: 'agent-1', name: 'New agent' } as AgentResource;

describe('useBuildManually', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.clearAllMocks();
		route.query = {};
		createAgent.mockResolvedValue(agent);
	});

	it('flags the trigger picker and routes to a new workflow within the given project', () => {
		const { buildManually } = useBuildManually();

		buildManually('project-1');

		expect(useUIStore().addFirstStepOnLoad).toBe(true);
		// Manual builds from Instance AI are attributed via the node-creator source.
		expect(useUIStore().addFirstStepOnLoadSource).toBe(NODE_CREATOR_OPEN_SOURCES.INSTANCE_AI);
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.NEW_WORKFLOW,
			query: { projectId: 'project-1' },
		});
		expect(push).toHaveBeenCalledTimes(1);
		expect(createAgent).not.toHaveBeenCalled();
	});

	it('omits the project query when no project is provided', () => {
		const { buildManually } = useBuildManually();

		buildManually();

		expect(push).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledWith({ name: VIEWS.NEW_WORKFLOW, query: {} });
		expect(createAgent).not.toHaveBeenCalled();
	});

	it('creates a blank agent and opens the agent builder for an agent creation intent', async () => {
		route.query = { intent: 'agent' };
		const { buildManually } = useBuildManually();

		await buildManually('project-1');

		expect(createAgent).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agents.new.defaultName',
		);
		expect(upsertProjectAgentsListCache).toHaveBeenCalledWith('project-1', agent);
		expect(track).toHaveBeenCalledWith('User created agent', {
			agent_id: 'agent-1',
			source: 'create_blank',
		});
		expect(push).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: 'agent-1' },
		});
		expect(push).toHaveBeenCalledTimes(1);
		expect(createAgent).toHaveBeenCalledTimes(1);
	});

	it('does not open a workflow when an agent creation intent has no project', async () => {
		route.query = { intent: 'agent' };
		const { buildManually } = useBuildManually();

		await buildManually();

		expect(createAgent).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		expect(showError).toHaveBeenCalledOnce();
	});

	it('shows an error when the blank agent cannot be created', async () => {
		route.query = { intent: 'agent' };
		const error = new Error('create failed');
		createAgent.mockRejectedValue(error);
		const { buildManually } = useBuildManually();

		await expect(buildManually('project-1')).resolves.toBeUndefined();

		expect(showError).toHaveBeenCalledWith(error, 'agentSelector.createAgentFailed');
		expect(push).not.toHaveBeenCalled();
	});

	it('ignores concurrent agent creation attempts', async () => {
		route.query = { intent: 'agent' };
		let resolveCreate = (_agent: AgentResource) => {};
		const pendingCreate = new Promise<AgentResource>((resolve) => {
			resolveCreate = resolve;
		});
		createAgent.mockReturnValue(pendingCreate);
		const { buildManually } = useBuildManually();

		const first = buildManually('project-1');
		const second = buildManually('project-1');
		resolveCreate(agent);
		await Promise.all([first, second]);

		expect(createAgent).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledOnce();
	});
});
