export const AGENTS_LIST_VIEW = 'AgentsListView';
export const AGENT_BUILDER_VIEW = 'AgentBuilderView';
export const NEW_AGENT_VIEW = 'NewAgentView';
export const AGENT_VIEW = 'AgentView';
export const AGENT_SESSIONS_LIST_VIEW = 'AgentSessionsListView';
export const AGENT_SESSION_DETAIL_VIEW = 'AgentSessionDetailView';
export const PROJECT_AGENTS = 'ProjectAgents';
export const AGENT_BUILDER_SETTINGS_VIEW = 'SettingsAgentBuilderView';

export const AGENTS_MODULE_NAME = 'agents';

export const AGENT_TOOLS_MODAL_KEY = 'agentToolsModal';
export const AGENT_TOOL_CONFIG_MODAL_KEY = 'agentToolConfigModal';
export const AGENT_SKILL_MODAL_KEY = 'agentSkillModal';
export const AGENT_ADD_TRIGGER_MODAL_KEY = 'agentAddTriggerModal';

/** Synthetic tree key for the combined "Agent" panel (name/model/credential/instructions). */
export const AGENT_SECTION_KEY = '__agent';
/** Synthetic tree key for the advanced panel (thinking/concurrency/approval). */
export const ADVANCED_SECTION_KEY = '__advanced';
/** Synthetic tree key for the evaluations list panel. */
export const EVALS_SECTION_KEY = '__evals';
/** Synthetic tree key for the full raw config.json view. */
export const CONFIG_JSON_SECTION_KEY = '__config_json';
/** Synthetic tree key for the agent executions tab. */
export const EXECUTIONS_SECTION_KEY = '__executions';

/**
 * Status of an assistant message during/after streaming.
 * Used by `useAgentChatStream`, `agentChatMessages`, and templates.
 */
export const CHAT_MESSAGE_STATUS = {
	STREAMING: 'streaming',
	SUCCESS: 'success',
	ERROR: 'error',
	AWAITING_USER: 'awaitingUser',
} as const;
export type ChatMessageStatus = (typeof CHAT_MESSAGE_STATUS)[keyof typeof CHAT_MESSAGE_STATUS];

/**
 * Lifecycle of a single tool-call as the agent runs.
 * `pending` → `running` → `done|error`, or `running` → `suspended` → `done`.
 */
export const TOOL_CALL_STATE = {
	PENDING: 'pending',
	RUNNING: 'running',
	SUSPENDED: 'suspended',
	DONE: 'done',
	ERROR: 'error',
} as const;
export type ToolCallState = (typeof TOOL_CALL_STATE)[keyof typeof TOOL_CALL_STATE];

/** Query-string key the builder uses to deep-link into a chat session. */
export const CONTINUE_SESSION_ID_PARAM = 'continueSessionId';
