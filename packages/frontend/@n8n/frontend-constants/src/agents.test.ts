import * as agentRouteNames from './agents';

describe('agent route names', () => {
	it('keeps every name and value the router and the MCP module link to', () => {
		expect({ ...agentRouteNames }).toEqual({
			AGENTS_LIST_VIEW: 'AgentsListView',
			AGENT_BUILDER_VIEW: 'AgentBuilderView',
			AGENT_PREVIEW_VIEW: 'AgentPreviewView',
			AGENT_VIEW: 'AgentView',
			AGENT_SESSIONS_LIST_VIEW: 'AgentSessionsListView',
			AGENT_SESSION_DETAIL_VIEW: 'AgentSessionDetailView',
			PROJECT_AGENTS: 'ProjectAgents',
		});
	});

	it('has unique values', () => {
		const values = Object.values(agentRouteNames);
		expect(new Set(values).size).toBe(values.length);
	});
});
