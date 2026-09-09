import { describe, it, expect } from 'vitest';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	OPEN_PREVIEW_PARAM,
	PROJECT_AGENTS,
} from '../constants';
import { AgentsModule } from '../module.descriptor';

describe('Agent constants', () => {
	it('exports all required route names', () => {
		expect(AGENTS_LIST_VIEW).toBe('AgentsListView');
		expect(AGENT_BUILDER_VIEW).toBe('AgentBuilderView');
		expect(AGENT_PREVIEW_VIEW).toBe('AgentPreviewView');
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

	it('registers a standalone agent preview route', function registersPreviewRoute() {
		const agentRoute = AgentsModule.routes?.find(function isAgentRoute(route) {
			return route.name === 'AgentView';
		});

		expect(agentRoute?.children).toContainEqual(
			expect.objectContaining({ name: AGENT_PREVIEW_VIEW, path: 'preview' }),
		);
	});
});
