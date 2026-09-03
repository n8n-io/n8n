import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const builderSessionIdentity = {
	agent_id: z.string(),
	user_id: z.string(),
	thread_id: z.string().optional().describe('Instance AI thread hosting the builder session'),
	run_id: z.string().optional().describe('Instance AI run that triggered this builder call'),
};

const agentStatus = z.enum(['draft', 'production']);

const agentRunType = z
	.enum(['test', 'production'])
	.describe('production means the run executed the published snapshot; test means it ran a draft');

// Spread into the session-metrics payload, matching `IAgentConfigurationTelemetryProperties`.
const agentConfigurationTelemetry = {
	model: z.string().nullable(),
	channels: z.array(z.string()),
	tool_types: z.array(z.string()),
	tool_count: z.number(),
	num_skills: z.number(),
	memory_type: z.enum([
		'none',
		'n8n',
		'n8n_observational',
		'n8n_episodic',
		'n8n_observational_episodic',
	]),
};

// Captured before the write, so a change to a live agent reports 'production'.
// The modification events express the same idea as has_published_version, which
// is stable across an editing session rather than only true on the first edit.
const builderPreWriteStatus = agentStatus.describe("Agent status before the builder's write");

const sessionId = z.string().describe('Editor push session id (pushRef)');

const agentConfigFingerprint = z.object({
	instructions: z.string(),
	tools: z.array(z.string()),
	skills: z.array(z.string()),
	tasks: z.array(z.string()),
	triggers: z.array(z.string()),
	vector_stores: z.array(z.string()),
	memory: z.object({ enabled: z.boolean(), storage: z.literal('n8n') }).nullable(),
	model: z.string().nullable(),
	config_version: z.string(),
});

// Tool identity is variant: node tools carry node_type, workflow tools carry
// workflow, custom tools carry custom_id, MCP servers carry server_name.
const toolIdentity = {
	node_type: z.string().optional(),
	workflow: z.string().optional(),
	custom_id: z.string().optional(),
	server_name: z.string().optional(),
};

// agent_id is only attached when the tools modal can resolve the hosting agent.
const optionalAgentId = z.string().optional();

// Mirrors `agentCapabilityKindSchema` in @n8n/api-types minus 'agent', which
// covers the core identity primitives (instructions, model, credential) —
// required fields rather than capabilities. Inlined because this package
// deliberately depends on zod alone.
const agentCapabilityKind = z.enum([
	'channel',
	'tool',
	'mcpServer',
	'skill',
	'task',
	'subAgent',
	'vectorStore',
]);

const agentConfigPart = z.enum([
	'instructions',
	'model',
	'credential',
	'memory',
	'name',
	'config',
	'tools',
	'providerTools',
	'skills',
	'tasks',
	'triggers',
	'subAgents',
	'mcpServers',
	'vectorStores',
]);

/** Identity carried by every per-surface agent lifecycle event. */
const agentActorIdentity = {
	agent_id: z.string(),
	project_id: z.string(),
	user_id: z.string().describe('The acting user, on every surface including MCP'),
};

/**
 * What the agent looked like at the moment of the event. Shared by the write
 * events and the publish events, using the same names and semantics as
 * "Agent setup completed", so an agent's profile lines up across its whole
 * lifecycle.
 */
const agentCapabilityProfile = {
	capability_kinds: z.array(agentCapabilityKind),
	capability_count: z.number(),
	tool_count: z.number(),
	skill_count: z.number(),
	sub_agent_count: z.number(),
	mcp_server_count: z.number(),
	vector_store_count: z.number(),
	task_count: z.number(),
	trigger_count: z.number(),
	model: z.string().nullable(),
	tool_types: z.array(z.string()).describe('Tool types, never user-authored tool names'),
};

/**
 * Shared by the six creation and modification events, which differ only in
 * which surface wrote and whether the write was the agent's first — so they
 * union into one picture of every agent write. `event_version` is per-event.
 */
const agentWrite = {
	...agentActorIdentity,
	...agentCapabilityProfile,
	changed_parts: z
		.array(agentConfigPart)
		.describe(
			'Config parts this save actually changed. "credential" is the model credential, which the retired "User edited agent config" reported as part "model". "config" is the feature block: web search and prompt caching. "providerTools" is the provider-native tools map, including web-search tool settings reconciled from config.webSearch.',
		),
	has_published_version: z
		.boolean()
		.describe(
			'Whether a live published version exists; stable across an editing session. Always false on the creation events, which is what makes the six safe to union.',
		),
};

/**
 * Shared by the three publish events. `republish` activates an older snapshot
 * — a rollback rather than shipping new work — so a "published" count that
 * should mean the latter must exclude it. `channel_connect` and `slack_setup`
 * are retained only for compatibility with historical auto-publish rows.
 */
const agentPublishTrigger = z
	.enum(['explicit', 'republish', 'channel_connect', 'slack_setup'])
	.describe(
		'What caused the publish, as opposed to who performed it. channel_connect and slack_setup are historical values only.',
	);

const agentPublish = {
	...agentActorIdentity,
	...agentCapabilityProfile,
	trigger: agentPublishTrigger,
	version_id: z.string().describe('AgentHistory versionId that became active'),
};

export const AGENTS_TELEMETRY = defineTelemetryEvents({
	AGENT_SETUP_COMPLETED: {
		name: 'Agent setup completed',
		description:
			'The first time an agent reached a complete setup: it passes the same validation the Publish button requires, and has at least one configured capability. Fires at most once per agent, guarded by the persisted `agents.setupCompletedAt`. Emitted from the config-save path, with the publish path as a backstop so a published agent is always marked first.',
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			user_id: z
				.string()
				.optional()
				.describe('Absent for builder writes made without an acting user'),
			capability_kinds: z
				.array(agentCapabilityKind)
				.describe('Capability kinds with at least one configured entry'),
			capability_count: z.number().describe('Total configured capabilities across all kinds'),
			tool_count: z.number(),
			skill_count: z.number(),
			sub_agent_count: z.number(),
			mcp_server_count: z.number().describe('MCP servers with a URL set'),
			vector_store_count: z.number(),
			task_count: z.number(),
			trigger_count: z.number().describe('Configured chat integrations; draft channels excluded'),
			status: agentStatus,
		}),
	},
	AGENT_EXECUTION_COUNT: {
		name: 'Agent execution count',
		description:
			'Six-hourly pulse of aggregate agent usage, bucketed by agent, run type and optional user. event_version 2 added run_type; version 1 rows are a mix of test and production and must not be read as production. token_count is broader than "Agent session metrics".cost_sum: it also covers LLM calls belonging to no single turn (title generation, observational/episodic memory, embeddings).',
		properties: z.object({
			event_version: z.literal('2'),
			agent_id: z.string(),
			user_id: z
				.string()
				.optional()
				.describe('Present only for runs with an n8n user — absent for chat integrations and cron'),
			run_type: agentRunType,
			message_count: z
				.number()
				.describe('Fresh top-level user turns; delegated child runs excluded'),
			token_count: z
				.number()
				.describe(
					'Includes LLM calls belonging to no turn (title generation, memory, embeddings), so runs higher than "Agent session metrics".token_count_sum',
				),
			tool_call_count: z.number(),
		}),
	},
	AGENT_SESSION_METRICS: {
		name: 'Agent session metrics',
		description:
			'Six-hourly pulse of agent session and turn metrics, bucketed by agent, run type, turn status and configuration. Two token numbers exist across the agent events and they measure different things: token_count_sum here covers only the recorded turns, from the same usage as cost_sum so the two reconcile, while token_count on "Agent execution count" additionally covers LLM calls belonging to no turn (title generation, observational/episodic memory, embeddings) and so runs higher.',
		properties: z.object({
			event_version: z.literal('1'),
			agent_id: z.string(),
			agent_type: z.literal('inline').optional(),
			run_type: agentRunType,
			turn_status: z.enum(['succeeded', 'failed']),
			session_count: z.number(),
			turn_count: z.number(),
			latency_ms_sum: z.number(),
			cost_sum: z.number(),
			token_count_sum: z
				.number()
				.describe('Recorded-turn tokens only; reconciles with cost_sum, unlike token_count'),
			tool_call_count_sum: z.number(),
			num_skills_sum: z.number(),
			...agentConfigurationTelemetry,
		}),
	},
	BUILDER_CREATED_AGENT: {
		name: 'Builder created agent',
		description:
			'The Instance AI builder was the first surface to configure an agent. One of three same-shaped creation events ("User created agent", "MCP created agent") — union them for total agent creation, or read one for that surface alone. Emitted from `AgentConfigService.updateConfig` on the agent\'s first configuring write, so the builder minting an agent row emits nothing and a build that fails before writing config never counts. event_version 2 replaced thread_id with user_id, moved the emit from the frontend-facing delegate wrapper to the config-save path, and added the write profile.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('2'),
		}),
	},
	USER_CREATED_AGENT: {
		name: 'User created agent',
		description:
			'A user was the first surface to configure an agent, from the editor. One of three same-shaped creation events ("Builder created agent", "MCP created agent") — union them for total agent creation, or read one for that surface alone. Emitted from `AgentConfigService.updateConfig` on the agent\'s first configuring write: agents are created lazily and the row alone emits nothing, so this fires when the agent gains a model, instructions or a capability rather than on the click, and an abandoned new-agent flow never counts. A rename or an icon change does not qualify. "User clicked new agent" carries the same agent_id, so the two join into a click-to-creation funnel whose gap is abandoned flows. event_version 2 dropped source (editor-only knowledge, still on the click event), added project_id, user_id and the write profile, and moved the emit to the backend.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('2'),
		}),
	},
	MCP_CREATED_AGENT: {
		name: 'MCP created agent',
		description:
			'An MCP client was the first surface to configure an agent, through the `create_agent` or `mutate_agent` tool. One of three same-shaped creation events ("User created agent", "Builder created agent") — union them for total agent creation, or read one for that surface alone. Emitted from `AgentConfigService.updateConfig` on the agent\'s first configuring write, so a `create_agent` call carrying no initial config emits nothing until something configures the agent. The coarser "User called mcp tool" event also fires for the same call.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('1'),
		}),
	},
	USER_MODIFIED_AGENT: {
		name: 'User modified agent',
		description:
			'A user saved a change to an agent that was already configured, from the editor. One of three same-shaped modification events ("Builder modified agent", "MCP modified agent") — union them for total agent modification, or read one for that surface alone. Emitted once per save from `AgentConfigService.updateConfig`; a save that changed nothing emits nothing, and the agent\'s first configuring write emits the matching creation event instead — so a write is never counted as both, and this event is not inflated by every agent\'s birth. The capability counts mirror "Agent setup completed", so a profile at each modification lines up with the profile at setup completion. Replaces the per-part "User edited agent config" and the per-item "User added/removed tools/skills/tasks" and "User added/removed agent tool" events, which fired several times for a single save and never covered the builder or MCP.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('1'),
		}),
	},
	BUILDER_MODIFIED_AGENT: {
		name: 'Builder modified agent',
		description:
			'The Instance AI builder saved a change to an agent that was already configured. One of three same-shaped modification events ("User modified agent", "MCP modified agent") — union them for total agent modification, or read one for that surface alone. Emitted once per save from `AgentConfigService.updateConfig`; a save that changed nothing emits nothing, and the agent\'s first configuring write emits "Builder created agent" instead. The capability counts mirror "Agent setup completed", so a profile at each modification lines up with the profile at setup completion. Replaces the per-item "Builder added tools/skills to agent" and "Builder removed tasks from agent" events.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('1'),
		}),
	},
	MCP_MODIFIED_AGENT: {
		name: 'MCP modified agent',
		description:
			'An MCP client saved a change to an agent that was already configured, through the `create_agent` or `mutate_agent` tool. One of three same-shaped modification events ("User modified agent", "Builder modified agent") — union them for total agent modification, or read one for that surface alone. Emitted once per save from `AgentConfigService.updateConfig`; a save that changed nothing emits nothing, and the agent\'s first configuring write emits "MCP created agent" instead. The capability counts mirror "Agent setup completed", so a profile at each modification lines up with the profile at setup completion. This surface had no modification telemetry before. The coarser "User called mcp tool" event also fires for the same call.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('1'),
		}),
	},
	USER_PUBLISHED_AGENT: {
		name: 'User published agent',
		description:
			'A user explicitly published an agent version, making it the active one. One of three same-shaped publish events ("Builder published agent", "MCP published agent") — union them for total agent publishing, or read one for that surface alone. Emitted from `AgentPublishService.publishAgent`; an idempotent no-op publish emits nothing. `republish` identifies a rollback to an older snapshot; `channel_connect` and `slack_setup` are retained only as historical trigger values. event_version 2 moved the emit from the frontend to the backend, which replaced the editor-only scope (version-history publishes were missing) with every user surface, dropped config_version, status and session_id, and added project_id, user_id, trigger, version_id and the capability profile.',
		properties: z.object({
			...agentPublish,
			event_version: z.literal('2'),
		}),
	},
	BUILDER_PUBLISHED_AGENT: {
		name: 'Builder published agent',
		description:
			'The Instance AI builder published an agent version through its publish_agent tool. One of three same-shaped publish events ("User published agent", "MCP published agent") — union them for total agent publishing, or read one for that surface alone. Emitted from `AgentPublishService.publishAgent`; an idempotent no-op publish emits nothing.',
		properties: z.object({
			...agentPublish,
			event_version: z.literal('1'),
		}),
	},
	MCP_PUBLISHED_AGENT: {
		name: 'MCP published agent',
		description:
			'An MCP client explicitly published an agent version through the `publish_agent` tool. One of three same-shaped publish events ("User published agent", "Builder published agent") — union them for total agent publishing, or read one for that surface alone. Emitted from `AgentPublishService.publishAgent`; an idempotent no-op publish emits nothing. Before this event existed these publishes were reported as "Agent published" with source "builder", so they were indistinguishable from Instance AI builder publishes.',
		properties: z.object({
			...agentPublish,
			event_version: z.literal('1'),
		}),
	},
	USER_UNPUBLISHED_AGENT: {
		name: 'User unpublished agent',
		description:
			'A user unpublished an agent, clearing its active version. One of three same-shaped unpublish events ("Builder unpublished agent", "MCP unpublished agent") — union them for total agent unpublishing, or read one for that surface alone. Emitted from `AgentPublishService.unpublishAgent`. Unlike the publish events these carry no trigger (there is one way to unpublish) and no capability profile. event_version 2 moved the emit from the frontend to the backend and replaced status and session_id with project_id and user_id.',
		properties: z.object({
			...agentActorIdentity,
			event_version: z.literal('2'),
		}),
	},
	BUILDER_UNPUBLISHED_AGENT: {
		name: 'Builder unpublished agent',
		description:
			'The Instance AI builder unpublished an agent through its unpublish_agent tool. One of three same-shaped unpublish events ("User unpublished agent", "MCP unpublished agent") — union them for total agent unpublishing, or read one for that surface alone. Emitted from `AgentPublishService.unpublishAgent`.',
		properties: z.object({
			...agentActorIdentity,
			event_version: z.literal('1'),
		}),
	},
	MCP_UNPUBLISHED_AGENT: {
		name: 'MCP unpublished agent',
		description:
			'An MCP client unpublished an agent through the `unpublish_agent` tool. One of three same-shaped unpublish events ("User unpublished agent", "Builder unpublished agent") — union them for total agent unpublishing, or read one for that surface alone. Emitted from `AgentPublishService.unpublishAgent`. Before this event existed these unpublishes were reported as "Agent unpublished" with source "builder", so they were indistinguishable from Instance AI builder unpublishes.',
		properties: z.object({
			...agentActorIdentity,
			event_version: z.literal('1'),
		}),
	},
	INSTANCE_AI_OPENED_FROM_AGENT_PREVIEW: {
		name: 'Instance AI opened from agent preview',
		description:
			'The user handed a preview chat session off to Instance AI from the agent builder preview panel.',
		properties: z.object({
			agent_id: z.string(),
			preview_thread_id: z.string(),
			preview_execution_id: z.string().optional(),
		}),
	},
	USER_GAVE_MCP_ACCESS_TO_AGENT: {
		name: 'User gave MCP access to agent',
		description:
			'An agent was exposed over MCP. The sibling "User gave MCP access to workflow" and "User toggled MCP access" events are not registered.',
		properties: z.object({
			agent_id: z.string(),
		}),
	},
	USER_SELECTED_AGENTS_FOR_MCP: {
		name: 'User selected agent from list',
		description:
			'The user confirmed a bulk agent selection in the MCP connect-agents dialog. Property is camelCase for warehouse continuity with existing rows.',
		properties: z.object({
			agentIds: z.array(z.string()),
			count: z.number(),
		}),
	},
	USER_DISMISSED_MCP_AGENTS_DIALOG: {
		name: 'User dismissed mcp agents dialog',
		description: 'The user closed the MCP connect-agents dialog without confirming a selection.',
		properties: z.object({}),
	},
	USER_CLICKED_CONNECT_AGENTS_FROM_MCP_SETTINGS: {
		name: 'User clicked connect agents from mcp settings',
		description: 'The user opened the MCP connect-agents dialog from the MCP settings page.',
		properties: z.object({}),
	},
	BUILDER_ADDED_TASKS: {
		name: 'Builder added tasks to agent',
		description:
			'The Instance AI builder created a scheduled task through the `create_tasks` tool. That path persists outside `AgentConfigService.updateConfig`, so it is not covered by "Builder modified agent" — this event stays until the task write path is folded in.',
		properties: z.object({
			...builderSessionIdentity,
			task_added: z.string().describe('Identifier of the newly added task'),
			tasks: z.array(z.string()).describe('Full task identifier list after the save'),
			status: builderPreWriteStatus,
		}),
	},
	BUILDER_ADDED_TRIGGER: {
		name: 'Builder added trigger to agent',
		description:
			'The Instance AI builder configured and persisted a chat channel for the target agent through the configure_channel tool, mirroring the frontend "User added trigger to agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			trigger_type: z.string().describe('Chat integration type that was configured and persisted'),
		}),
	},
	BUILDER_ASKED_QUESTIONS: {
		name: 'Builder asked questions',
		description:
			'The Instance AI builder used the ask_questions tool and suspended, showing the user a batch of questions to determine the shape of the agent.',
		properties: z.object({
			...builderSessionIdentity,
			question_count: z.number(),
			question_types: z.array(z.string()).describe('Distinct question types in the batch'),
		}),
	},
	USER_ANSWERED_BUILDER_QUESTIONS: {
		name: 'User answered builder questions',
		description:
			'The user resumed a builder ask_questions card by answering, skipping, or dismissing it.',
		properties: z.object({
			...builderSessionIdentity,
			outcome: z.enum(['answered', 'skipped', 'dismissed']),
			answered_count: z.number(),
			skipped_count: z.number(),
		}),
	},
	BUILDER_REQUESTED_CREDENTIAL: {
		name: 'Builder requested credential',
		description:
			'The Instance AI builder used the ask_credential (or ask_embedding_credential) tool and suspended to show a credential picker card. Does not fire when the request auto-resolves without showing a card.',
		properties: z.object({
			...builderSessionIdentity,
			credential_type: z.string(),
		}),
	},
	USER_PROVIDED_CREDENTIAL: {
		name: 'User provided credential',
		description:
			'The user resumed a builder credential picker card by selecting a credential or skipping.',
		properties: z.object({
			...builderSessionIdentity,
			credential_type: z.string(),
			outcome: z.enum(['provided', 'skipped']),
		}),
	},

	// -------------------------------------------------------------------------
	// Frontend editor events (backfilled). These names are live warehouse table
	// names — do not rename them.
	// -------------------------------------------------------------------------
	USER_CLICKED_NEW_AGENT: {
		name: 'User clicked new agent',
		description:
			'The user clicked a new-agent entry point (button, dropdown, or card). No agent exists at this point — `agent_id` is the id minted for the click, which whichever path later persists the agent creates it under, so this joins to the eventual creation event. Clicks with no matching creation are abandoned new-agent flows.',
		properties: z.object({
			source: z.enum(['button', 'dropdown', 'card']),
			agent_id: z.string().describe('Minted at the click; no agent row exists yet'),
			manual: z
				.boolean()
				.optional()
				.describe(
					'True when the click came from a "Create agent manually" entry point that skips the Instance AI flow',
				),
			session_id: sessionId,
		}),
	},
	USER_SUBMITTED_MESSAGE_TO_AGENT: {
		name: 'User submitted message to agent',
		description:
			'The user sent a test-mode chat message to an agent, with a fingerprint of the agent config at send time.',
		properties: z.object({
			agent_id: z.string(),
			mode: z.literal('test').describe('Constant dimension kept for warehouse-schema stability'),
			status: agentStatus,
			agent_config: agentConfigFingerprint,
			session_id: sessionId,
		}),
	},
	USER_ADDED_TRIGGER_TO_AGENT: {
		name: 'User added trigger to agent',
		description: 'The user configured and persisted a chat trigger from the agent builder.',
		properties: z.object({
			agent_id: z.string(),
			trigger_type: z.string(),
			triggers: z.array(z.string()).describe('Configured trigger types after the change'),
			config_version: z.string(),
			status: agentStatus,
			session_id: sessionId,
		}),
	},
	USER_ADDED_AGENT_NODE: {
		name: 'User added agent node',
		description:
			'The user added a Message an Agent node to the workflow canvas. agent_source distinguishes the inline agent variant from calling an existing agent.',
		properties: z.object({
			agent_source: z
				.enum(['inline', 'referenced'])
				.optional()
				.describe(
					"Omitted when the node was added without the agents panel preset (treat as 'referenced')",
				),
			agent_id: z.string().optional().describe('Referenced agent ID, when one was picked'),
			workflow_id: z.string(),
			node_id: z.string(),
			node_version: z.number(),
		}),
	},
	USER_OPENED_AGENT_TOOL: {
		name: 'User opened agent tool',
		description: 'The user opened a tool from the builder capabilities list.',
		properties: z.object({
			agent_id: z.string(),
			tool_type: z.string(),
			session_id: sessionId,
		}),
	},
	USER_OPENED_AGENT_SKILL: {
		name: 'User opened agent skill',
		description: 'The user opened a skill from the builder capabilities list.',
		properties: z.object({
			agent_id: z.string(),
			skill_id: z.string(),
			session_id: sessionId,
		}),
	},
	USER_OPENED_ADD_SKILL_MODAL: {
		name: 'User opened add skill modal',
		description: 'The user opened the add-skill modal in the builder.',
		properties: z.object({
			agent_id: z.string(),
			session_id: sessionId,
		}),
	},
	USER_IMPORTED_AGENT_SKILL: {
		name: 'User imported agent skill',
		description:
			'The user imported a skill into an agent from a skill file or folder, with success or error outcome.',
		properties: z.object({
			agent_id: z.string(),
			source: z.enum(['skill_file', 'folder']),
			status: z.enum(['success', 'error']),
			reference_count: z.number(),
			error: z.string().optional(),
			session_id: sessionId,
		}),
	},
	USER_STARTED_ADDING_AGENT_TOOL: {
		name: 'User started adding agent tool',
		description:
			'The user started adding an available tool manually by connecting it or creating a workflow.',
		properties: z.object({
			tool_type: z.enum(['custom', 'workflow', 'node']),
			source: z.literal('manual'),
			agent_id: optionalAgentId,
		}),
	},
	USER_EDITED_AGENT_TOOL: {
		name: 'User edited agent tool',
		description: "An existing agent tool's configuration was saved from the tools modal.",
		properties: z.object({
			tool_type: z.enum(['custom', 'workflow', 'node']),
			...toolIdentity,
			agent_id: optionalAgentId,
		}),
	},
	USER_OPENED_AGENT_PREVIEW: {
		name: 'User opened agent preview',
		description: 'The user opened the agent preview panel in the builder.',
		properties: z.object({
			agent_id: z.string(),
		}),
	},
	USER_SAVED_AGENT_SKILL: {
		name: 'User saved agent skill',
		description: 'An agent skill autosave completed in the builder.',
		properties: z.object({
			agent_id: z.string(),
			skill_id: z.string(),
		}),
	},
});
