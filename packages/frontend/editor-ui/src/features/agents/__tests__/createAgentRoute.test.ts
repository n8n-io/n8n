import { describe, expect, it, vi } from 'vitest';
import { newAgentRoute } from '../createAgentRoute';

vi.mock('@n8n/utils/generate-nano-id', () => ({ generateNanoId: () => 'aBcDeFgHiJkLmNoP' }));

describe('newAgentRoute', () => {
	it('routes directly to the builder with the given pending agent id in history state', () => {
		expect(newAgentRoute('project-1', 'mIntEdAtTheClIck')).toEqual({
			name: 'AgentBuilderView',
			params: { projectId: 'project-1', agentId: 'mIntEdAtTheClIck' },
			state: { instanceAiPendingAgentId: 'mIntEdAtTheClIck' },
		});
	});

	it('mints an id when none is given', () => {
		expect(newAgentRoute('project-1')).toEqual({
			name: 'AgentBuilderView',
			params: { projectId: 'project-1', agentId: 'aBcDeFgHiJkLmNoP' },
			state: { instanceAiPendingAgentId: 'aBcDeFgHiJkLmNoP' },
		});
	});
});
