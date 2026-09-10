import { describe, it, expect } from 'vitest';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	OPEN_PREVIEW_PARAM,
	PROJECT_AGENTS,
} from '../constants';
import { AgentsModule } from '../module.descriptor';

describe('Agent constants', () => {
	it('exports all required route names', () => {
		expect(AGENTS_LIST_VIEW).toBe('AgentsListView');
		expect(AGENT_BUILDER_VIEW).toBe('AgentBuilderView');
		expect(OPEN_PREVIEW_PARAM).toBe('openPreview');
		expect(PROJECT_AGENTS).toBe('ProjectAgents');
	});

	it('registers the new-agent transition route', () => {
		expect(AgentsModule.routes).toContainEqual(
			expect.objectContaining({
				name: 'NewAgentView',
				path: '/new-agent',
			}),
		);
	});

	it('does not register a standalone agent preview route', () => {
		const agentRoute = AgentsModule.routes?.find((route) => route.name === 'AgentView');

		expect(agentRoute?.children).not.toContainEqual(expect.objectContaining({ path: 'preview' }));
	});
});
