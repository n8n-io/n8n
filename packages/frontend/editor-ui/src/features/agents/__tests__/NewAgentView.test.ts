import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NewAgentView from '../views/NewAgentView.vue';
import { AGENTS_LIST_VIEW, AGENT_BUILDER_VIEW, PROJECT_AGENTS } from '../constants';
import type { AgentResource } from '../types';

const mocks = vi.hoisted(() => ({
	route: { query: { projectId: 'project-1' } as Record<string, string> },
	replace: vi.fn(),
	createAgent: vi.fn(),
	upsertProjectAgentsListCache: vi.fn(),
	track: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => mocks.route,
	useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));
vi.mock('../composables/useAgentApi', () => ({ createAgent: mocks.createAgent }));
vi.mock('../composables/useProjectAgentsList', () => ({
	upsertProjectAgentsListCache: mocks.upsertProjectAgentsListCache,
}));

describe('NewAgentView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.route.query = { projectId: 'project-1' };
	});

	it('creates a blank agent and opens its builder', async () => {
		const agent = { id: 'agent-1', name: 'New agent' } as AgentResource;
		mocks.createAgent.mockResolvedValue(agent);

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.createAgent).toHaveBeenCalledOnce();
		expect(mocks.createAgent).toHaveBeenCalledWith(
			{ baseUrl: '/rest', pushRef: 'push-ref' },
			'project-1',
			'agents.new.defaultName',
		);
		expect(mocks.upsertProjectAgentsListCache).toHaveBeenCalledWith('project-1', agent);
		expect(mocks.track).toHaveBeenCalledWith('User created agent', {
			agent_id: 'agent-1',
			source: 'create_blank',
		});
		expect(mocks.replace).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: 'agent-1' },
		});
	});

	it('returns to the agents list when no project was provided', async () => {
		mocks.route.query = {};

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.createAgent).not.toHaveBeenCalled();
		expect(mocks.showError).toHaveBeenCalledWith(
			expect.any(Error),
			'agentSelector.createAgentFailed',
		);
		expect(mocks.replace).toHaveBeenCalledWith({ name: AGENTS_LIST_VIEW });
	});

	it('returns to the project agents list when creation fails', async () => {
		const error = new Error('create failed');
		mocks.createAgent.mockRejectedValue(error);

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.showError).toHaveBeenCalledWith(error, 'agentSelector.createAgentFailed');
		expect(mocks.replace).toHaveBeenCalledWith({
			name: PROJECT_AGENTS,
			params: { projectId: 'project-1' },
		});
	});
});
