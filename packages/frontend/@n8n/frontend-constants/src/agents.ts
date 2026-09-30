/**
 * Route names for the agents feature. They live here so a module outside the shell
 * (the MCP module's `AgentsTable.vue`) can link to an agent route without an `@/`
 * import. The values are unchanged; `@/features/agents/constants` re-exports them.
 */

export const AGENTS_LIST_VIEW = 'AgentsListView';
export const AGENT_BUILDER_VIEW = 'AgentBuilderView';
export const AGENT_PREVIEW_VIEW = 'AgentPreviewView';
export const AGENT_VIEW = 'AgentView';
export const AGENT_SESSIONS_LIST_VIEW = 'AgentSessionsListView';
export const AGENT_SESSION_DETAIL_VIEW = 'AgentSessionDetailView';
export const PROJECT_AGENTS = 'ProjectAgents';
