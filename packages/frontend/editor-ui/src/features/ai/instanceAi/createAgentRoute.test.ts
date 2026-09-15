import { describe, expect, it } from 'vitest';
import { instanceAiCreateAgentRoute } from './createAgentRoute';

describe('instanceAiCreateAgentRoute', () => {
	it('routes agent creation directly to the new-agent view', () => {
		expect(instanceAiCreateAgentRoute('project-1')).toEqual({
			name: 'NewAgentView',
			query: { projectId: 'project-1' },
		});
	});

	it('carries the id minted at the click in history state so the view adopts it', () => {
		expect(instanceAiCreateAgentRoute('project-1', 'aBcDeFgHiJkLmNoP')).toEqual({
			name: 'NewAgentView',
			query: { projectId: 'project-1' },
			state: { instanceAiPendingAgentId: 'aBcDeFgHiJkLmNoP' },
		});
	});
});
