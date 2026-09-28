export {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	PROJECT_AGENTS,
} from '@n8n/frontend-constants/agents';

export const AGENTS_MODULE_NAME = 'agents';

export const AGENT_TOOLS_MODAL_KEY = 'agentToolsModal';
export const AGENT_TOOL_CONFIG_MODAL_KEY = 'agentToolConfigModal';
export const AGENT_SKILL_MODAL_KEY = 'agentSkillModal';
export const AGENT_TASK_MODAL_KEY = 'agentTaskModal';
export const AGENT_SUB_AGENTS_MODAL_KEY = 'agentSubAgentsModal';
export const AGENT_VECTOR_STORES_MODAL_KEY = 'agentVectorStoresModal';
export const AGENT_JSON_IMPORT_MODAL_KEY = 'agentJsonImportModal';
export const AGENT_CONFIRMATION_MODAL_KEY = 'agentConfirmation';
export const AGENT_DUPLICATE_MODAL_KEY = 'agentDuplicateModal';
export const AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE = 'openAiApi';

/** Synthetic tree key for the combined "Agent" panel (name/model/credential/instructions). */
export const AGENT_SECTION_KEY = '__agent';
/** Synthetic tree key for the advanced panel (reasoning/concurrency/approval). */
export const ADVANCED_SECTION_KEY = '__advanced';
/** Synthetic tree key for the full raw config.json view. */
export const CONFIG_JSON_SECTION_KEY = '__config_json';
/** Synthetic tree key for the agent executions tab. */
export const EXECUTIONS_SECTION_KEY = '__executions';

/**
 * Rows read in one page of an agent's eval cases. Set to the row route's own ceiling
 * (`MAX_ITEMS_PER_PAGE`), which is the most this view can read without paging — so a
 * dataset is fully editable up to that size. Generation caps a dataset at 20, but
 * cases can also be added by hand or by attaching a table, and a row past this page
 * would otherwise be invisible *and* uneditable while still counting toward the run.
 * The card says so explicitly when the server's total exceeds what it loaded.
 */
export const AGENT_EVAL_CASES_PAGE_SIZE = 250;

export {
	CHAT_MESSAGE_STATUS,
	TOOL_CALL_STATE,
	type ChatMessageStatus,
	type ToolCallState,
} from '@/features/ai/shared/agentsChat/constants';

/** Query-string key the builder uses to deep-link into a chat session. */
export const CONTINUE_SESSION_ID_PARAM = 'continueSessionId';
export const NEW_SESSION_PARAM = 'newSession';
export const OPEN_PREVIEW_PARAM = 'openPreview';
/** Query-string key holding the embedded n8n Assistant panel's active thread id. */
export const ASSISTANT_THREAD_PARAM = 'assistantThread';

/**
 * History-state key for the agent id minted at the click. Carried to the
 * builder so the "clicked" and "created" telemetry events share a join key
 * even though no agent exists yet. Kept out of the URL so a hand-authored
 * query cannot force the builder to adopt an arbitrary id.
 */
export const PENDING_AGENT_ID_STATE = 'instanceAiPendingAgentId';
