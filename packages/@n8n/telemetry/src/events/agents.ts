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

const agentRunSource = z
	.string()
	.describe(
		'Run source: instance-ai, mcp, chat, n8n_chat, n8n_chat_production, workflow, task, subagent, or a chat integration (slack, telegram, linear, discord, whatsapp, teams). Preserve the runtime source value. unknown means the source was unavailable.',
	);

const agentExecutionCounts = {
	message_count: z.number().describe('Fresh top-level user turns; delegated child runs excluded'),
	token_count: z
		.number()
		.describe(
			'Includes LLM calls belonging to no turn (title generation, memory, embeddings), so runs higher than "Agent session metrics".token_count_sum',
		),
	tool_call_count: z.number(),
};

const agentSessionMetrics = {
	session_count: z.number(),
	turn_count: z.number(),
	latency_ms_sum: z.number(),
	cost_sum: z.number(),
	token_count_sum: z
		.number()
		.describe('Recorded-turn tokens only; reconciles with cost_sum, unlike token_count'),
	tool_call_count_sum: z.number(),
	num_skills_sum: z.number(),
};

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

const n8nChatVariant = z
	.string()
	.nullable()
	.describe('The 125_agents_n8n_chat PostHog variant; null when the user has no flag value');

const agentPublish = {
	...agentActorIdentity,
	...agentCapabilityProfile,
	trigger: agentPublishTrigger,
	version_id: z.string().describe('AgentHistory versionId that became active'),
};

export const AGENTS_TELEMETRY = defineTelemetryEvents({
	AGENT_TEAMS_SETUP_STEP: {
		name: 'Agent Teams setup step',
		description:
			"One step of the recommended Microsoft Teams setup finished or failed. Tells us which rung of the bot ladder people actually land on, which is the question the ladder exists to answer: n8n can only create the bot when the tenant has an Azure subscription, and a Microsoft 365 tenant does not come with one. `outcome: 'failed'` carries a `reason` naming the wall that was hit, never the message.",
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			user_id: z.string(),
			step: z
				.enum(['connect', 'create_app', 'create_bot', 'availability', 'install'])
				.describe('Which step of the recommended setup this reports'),
			outcome: z.enum(['succeeded', 'failed']),
			bot_route: z
				.enum(['provisioned', 'manual'])
				.optional()
				.describe(
					"Only on the bot step. 'provisioned' means n8n created it through Azure; 'manual' means the user was sent to make it themselves.",
				),
			install_route: z
				.enum(['published', 'submitted', 'upload'])
				.optional()
				.describe(
					"Only on the install step. 'submitted' means the account could not publish directly and the app went in for review.",
				),
			reason: z
				.string()
				.optional()
				.describe(
					'A fixed code for why the step failed, such as blocked_by_policy or cannot_register_apps. Never a message, which could carry tenant detail.',
				),
		}),
	},
	USER_RESPONDED_TO_AGENT_TOOL_APPROVAL: {
		name: 'User responded to agent tool approval',
		description:
			'The tool gate accepted a human approval response. Excludes parent forwarding and calls that use an existing session grant. A session grant can still fail to save.',
		properties: z.object({
			agent_id: z.string(),
			user_id: z.string().optional(),
			run_type: agentRunType,
			approved: z.boolean(),
			scope: z.enum(['once', 'session']),
			counts_by_source: z
				.record(agentRunSource, z.object({ count: z.literal(1) }))
				.optional()
				.describe('One entry for the run source, with count 1 for this approval response'),
		}),
	},
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
			'Six-hourly pulse of aggregate agent usage, bucketed by agent, run type and optional user. event_version 3 added first_message_at. event_version 2 added run_type; version 1 rows are a mix of test and production and must not be read as production. token_count is broader than "Agent session metrics".cost_sum: it also covers LLM calls belonging to no single turn (title generation, observational/episodic memory, embeddings).',
		properties: z.object({
			event_version: z.literal('3'),
			agent_id: z.string(),
			user_id: z
				.string()
				.optional()
				.describe('Present only for runs with an n8n user — absent for chat integrations and cron'),
			run_type: agentRunType,
			...agentExecutionCounts,
			first_message_at: z.iso
				.datetime()
				.optional()
				.describe(
					'ISO 8601 time of the first message in this buffer window. Absent when message_count is zero.',
				),
			counts_by_source: z
				.record(agentRunSource, z.object(agentExecutionCounts))
				.optional()
				.describe(
					'Counters by run source. Each counter sums to its top-level total. Delegated token and tool usage stays with the parent run source.',
				),
		}),
	},
	AGENT_SESSION_METRICS: {
		name: 'Agent session metrics',
		description:
			'Six-hourly pulse of agent session and turn metrics, bucketed by agent, optional user, run type, turn status and configuration. Two token numbers exist across the agent events and they measure different things: token_count_sum here covers only the recorded turns, from the same usage as cost_sum so the two reconcile, while token_count on "Agent execution count" additionally covers LLM calls belonging to no turn (title generation, observational/episodic memory, embeddings) and so runs higher.',
		properties: z.object({
			event_version: z.literal('1'),
			agent_id: z.string(),
			user_id: z.string().optional(),
			agent_type: z.literal('inline').optional(),
			run_type: agentRunType,
			turn_status: z.enum(['succeeded', 'failed']),
			...agentSessionMetrics,
			counts_by_source: z
				.record(agentRunSource, z.object(agentSessionMetrics))
				.optional()
				.describe(
					'Metrics by run source. Turn metrics sum to the top-level totals. session_count and num_skills_sum count each session once per source, so they can overlap across sources.',
				),
			...agentConfigurationTelemetry,
		}),
	},
	BUILDER_CREATED_AGENT: {
		name: 'Builder created agent',
		description:
			'The Instance AI builder persisted a new Agent. Emitted after the Agent and its initial configuration commit, including incomplete drafts. A later build failure does not undo creation. Union the user, builder, and MCP creation events to count all new Agents. Adoption of an existing Agent emits no creation event. Version 3 reports the committed insert instead of the first configuring update.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('3'),
		}),
	},
	USER_CREATED_AGENT: {
		name: 'User created agent',
		description:
			'A user persisted a new Agent from the editor, a template, or duplication. Emitted after the Agent and its initial configuration commit, regardless of its default model or setup readiness. Union the user, builder, and MCP creation events to count all new Agents. User clicked new agent joins through agent_id. User duplicated agent retains the source Agent context. Version 3 reports the committed insert instead of the first configuring update.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('3'),
		}),
	},
	MCP_CREATED_AGENT: {
		name: 'MCP created agent',
		description:
			'An MCP client persisted a new Agent through create_agent, with or without initial configuration. Emitted after the Agent and its configuration commit. Union the user, builder, and MCP creation events to count all new Agents. User called mcp tool also reports the tool call. Version 2 reports the committed insert instead of the first configuring update.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('2'),
		}),
	},
	USER_MODIFIED_AGENT: {
		name: 'User modified agent',
		description:
			'A user saved a tracked configuration or resource change to an existing Agent. Emitted after the change commits. Incomplete Agents also count. No-op and cosmetic-only saves emit nothing. Creation emits User created agent instead. The profile describes the saved configuration. Version 2 removes the configured-state gate and creation inference.',
		properties: z.object({
			...agentWrite,
			changed_settings: z
				.array(
					z.enum([
						'monthly_budget',
						'budget_alert',
						'session_cost_cap',
						'custom_model_routing',
						'memory_model',
						'cache_duration',
						'tool_concurrency',
						'max_iterations',
					]),
				)
				.optional()
				.describe(
					'Names of tracked settings changed by the committed user write, in the listed order. New emissions include an empty array when none changed. Compares stored fields, including added or removed overrides. Model settings compare model IDs, not credentials. Budget settings compare amounts and the alert threshold, not the shared enabled flag. Never includes setting values.',
				),
			event_version: z.literal('2'),
		}),
	},
	BUILDER_MODIFIED_AGENT: {
		name: 'Builder modified agent',
		description:
			'The Instance AI builder saved a tracked configuration or resource change to an existing Agent. Emitted after the change commits, including the first generated configuration of a saved draft. No-op and cosmetic-only saves emit nothing. Creation emits Builder created agent instead. The profile describes the saved configuration. Version 2 removes the configured-state gate and creation inference.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('2'),
		}),
	},
	MCP_MODIFIED_AGENT: {
		name: 'MCP modified agent',
		description:
			'An MCP client saved a tracked configuration or resource change to an existing Agent through mutate_agent. Emitted after the change commits. Incomplete Agents also count. No-op and cosmetic-only saves emit nothing. Creation emits MCP created agent instead. User called mcp tool also reports the tool call. Version 2 removes the configured-state gate and creation inference.',
		properties: z.object({
			...agentWrite,
			event_version: z.literal('2'),
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
			'The Instance AI builder published an agent version through its agent_builder_publish_agent tool. One of three same-shaped publish events ("User published agent", "MCP published agent") — union them for total agent publishing, or read one for that surface alone. Emitted from `AgentPublishService.publishAgent`; an idempotent no-op publish emits nothing.',
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
			'The Instance AI builder unpublished an agent through its agent_builder_unpublish_agent tool. One of three same-shaped unpublish events ("User unpublished agent", "MCP unpublished agent") — union them for total agent unpublishing, or read one for that surface alone. Emitted from `AgentPublishService.unpublishAgent`.',
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
	USER_DISMISSED_AGENT_PUBLISHED_MODAL: {
		name: 'User dismissed agent published modal',
		description:
			'The user closed the "Agent published" confirmation modal shown after a successful agent publish. `dont_show_again` reports the state of the "Don\'t show again" checkbox at dismissal; when checked, the modal is not shown on later publishes.',
		properties: z.object({
			agent_id: z.string(),
			dont_show_again: z.boolean(),
			session_id: sessionId.optional(),
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
			'Historical event for scheduled tasks created by the Instance AI builder. No longer emitted. Task creation now emits Builder modified agent through the shared task persistence service.',
		properties: z
			.object({
				...builderSessionIdentity,
				task_added: z.string().describe('Identifier of the newly added task'),
				tasks: z.array(z.string()).describe('Full task identifier list after the save'),
				status: builderPreWriteStatus,
			})
			.meta({ deprecated: true }),
	},
	BUILDER_ADDED_TRIGGER: {
		name: 'Builder added trigger to agent',
		description:
			'The Instance AI builder configured and persisted a chat channel for the target agent through the agent_builder_configure_channel tool, mirroring the frontend "User added trigger to agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			trigger_type: z.string().describe('Chat integration type that was configured and persisted'),
		}),
	},
	BUILDER_ASKED_QUESTIONS: {
		name: 'Builder asked questions',
		description:
			'The Instance AI builder used the agent_builder_ask_questions tool and suspended, showing the user a batch of questions to determine the shape of the agent.',
		properties: z.object({
			...builderSessionIdentity,
			question_count: z.number(),
			question_types: z.array(z.string()).describe('Distinct question types in the batch'),
		}),
	},
	USER_ANSWERED_BUILDER_QUESTIONS: {
		name: 'User answered builder questions',
		description:
			'The user resumed a builder agent_builder_ask_questions card by answering, skipping, or dismissing it.',
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
			'The Instance AI builder used the agent_builder_ask_credential (or agent_builder_ask_embedding_credential) tool and suspended to show a credential picker card. Does not fire when the request auto-resolves without showing a card.',
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
			'The user clicked a new-agent entry point (button, dropdown, card, command bar, or an Agents empty-state action: create blank, a typed prompt, or a starter template). No agent exists at this point — `agent_id` is the id minted for the click, which whichever path later persists the agent creates it under, so this joins to the eventual creation event. Clicks with no matching creation are abandoned new-agent flows.',
		properties: z.object({
			source: z.enum([
				'button',
				'dropdown',
				'card',
				'empty_state_blank',
				'empty_state_prompt',
				'empty_state_template',
				'command_bar',
			]),
			agent_id: z.string().describe('Minted at the click; no agent row exists yet'),
			template_id: z
				.string()
				.optional()
				.describe('Starter template chosen in the Agents empty state'),
			manual: z
				.boolean()
				.optional()
				.meta({ deprecated: true })
				.describe(
					'Deprecated: the "Create agent manually" entry point was removed. No longer emitted.',
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
	USER_CLICKED_AGENTS_TAB: {
		name: 'User clicked agents tab',
		description:
			'The user activated a Build, Sessions, Knowledge, or Settings tab in the agent builder. Includes repeated clicks on the active tab. Excludes programmatic tab changes.',
		properties: z.object({
			agent_id: z.string(),
			name: z.enum(['build', 'sessions', 'knowledge', 'settings']).describe('Activated tab'),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_KNOWLEDGE_UPLOAD: {
		name: 'User clicked knowledge upload',
		description:
			'The user opened the knowledge file picker in the agent builder. Includes clicks followed by cancellation. Does not report selected files.',
		properties: z.object({
			agent_id: z.string(),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_TRACE_ITEM: {
		name: 'User clicked trace item',
		description:
			'The user selected an agent session timeline item with the chart, table, or keyboard. Excludes selection restoration and deselection.',
		properties: z.object({
			agent_id: z.string(),
			item_type: z
				.enum([
					'user',
					'agent',
					'skill',
					'tool',
					'node',
					'workflow',
					'execution-error',
					'suspension',
					'hitl-response',
					'background-task-signal',
				])
				.describe('Selected timeline item kind. Does not include item content.'),
			session_id: sessionId,
		}),
	},
	USER_APPLIED_SESSION_FILTER: {
		name: 'User applied session filter',
		description:
			'The user changed or cleared agent session filters. Fires once per action before results load, with only the names of changed fields.',
		properties: z.object({
			agent_id: z.string(),
			filter_names: z
				.array(z.enum(['status', 'origin', 'start_date', 'end_date']))
				.describe('Changed filter fields. Does not include filter values or dates.'),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_NEW_TEST_CHAT_ICON_FROM_TEST_PANEL: {
		name: 'User clicked new test chat icon from test panel',
		description:
			'The user started a new test chat from the preview dock icon, its shortcut, or the standalone preview button.',
		properties: z.object({
			agent_id: z.string(),
			source: z
				.enum(['test-panel', 'shortcut', 'standalone'])
				.describe('Origin of the new chat action'),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_MORE_OPTIONS_FROM_TEST_PANEL: {
		name: 'User clicked more options from test panel',
		description:
			'The user opened the preview dock More menu. Excludes menu closure and metadata refresh.',
		properties: z.object({
			agent_id: z.string(),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_AN_OPTION_FROM_MORE_LIST: {
		name: 'User clicked an option from more list',
		description:
			'The user selected an enabled preview dock More menu action. Fires before the action, even if it fails or the user cancels confirmation.',
		properties: z.object({
			agent_id: z.string(),
			option: z
				.enum([
					'copy-link',
					'copy-conversation',
					'open-in-new-tab',
					'toggle-full-width',
					'export-session',
					'delete-session',
				])
				.describe('Selected menu action'),
			session_id: sessionId,
		}),
	},
	USER_OPENED_AGENT_PREVIEW: {
		name: 'User opened agent preview',
		description: 'The user opened the agent preview panel in the builder.',
		properties: z.object({
			agent_id: z.string(),
			source: z
				.enum(['icon', 'primary'])
				.optional()
				.describe('The button that opened the preview. Omit this for non-button openings.'),
		}),
	},
	USER_REVERTED_CHANGES_ON_AGENT: {
		name: 'User reverted changes on agent',
		description:
			'The user successfully reverted draft changes to the published version or a selected version in the Agent Builder.',
		properties: z.object({
			agent_id: z.string(),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_TRACE_DETAILS_FROM_TEST_PANEL: {
		name: 'User clicked trace details from test panel',
		description:
			'The user activated the enabled Trace details control in the agent preview. Fires before navigation, not after trace loading.',
		properties: z.object({
			agent_id: z.string(),
			session_id: sessionId,
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
	USER_STARTED_AGENT_CHANNEL_SETUP: {
		name: 'User started agent channel setup',
		description:
			'The setup view of a chat channel became visible in the agent channel modal. Pairs with "User closed agent channel setup" to measure the setup funnel.',
		properties: z.object({
			agent_id: z.string(),
			channel_type: z.string(),
			session_id: sessionId,
		}),
	},
	USER_CLOSED_AGENT_CHANNEL_SETUP: {
		name: 'User closed agent channel setup',
		description:
			'The user left a chat channel setup view: after connecting the channel, going back to the channel list, or closing the modal. Fires once for each "User started agent channel setup".',
		properties: z.object({
			agent_id: z.string(),
			channel_type: z.string(),
			completed: z.boolean().describe('True when the channel was connected'),
			session_id: sessionId,
		}),
	},
	USER_FAILED_TO_CONNECT_AGENT_CHANNEL: {
		name: 'User failed to connect agent channel',
		description:
			'Saving a chat channel setup failed. The user can retry, so one setup can emit this more than once.',
		properties: z.object({
			agent_id: z.string(),
			channel_type: z.string(),
			stage: z
				.enum(['persist', 'before_save', 'connect'])
				.describe(
					'persist: saving the agent failed; before_save: the platform pre-save step failed; connect: the connect request failed',
				),
			conflict: z.boolean().describe('True when the connect request answered 409'),
			session_id: sessionId,
		}),
	},
	USER_CHECKED_TEAMS_CHANNEL_CREDENTIAL: {
		name: 'User checked Teams channel credential',
		description:
			'The Teams channel setup checked the selected credential against Microsoft. Runs on its own whenever the selected credential changes, including when the setup opens with one, and when the user clicks recheck.',
		properties: z.object({
			agent_id: z.string(),
			trigger: z
				.enum(['auto', 'recheck'])
				.describe('auto: the selected credential changed; recheck: the user clicked recheck'),
			status: z.enum(['ok', 'failed']),
			reason: z
				.enum(['certificate', 'incomplete', 'rejected', 'unreachable', 'cloud', 'request_failed'])
				.optional()
				.describe(
					'Only when status is failed. request_failed: the request to n8n failed, so Microsoft was never asked',
				),
			session_id: sessionId,
		}),
	},
	USER_CLICKED_DEPLOY_TO_AZURE_FOR_TEAMS_CHANNEL: {
		name: 'User clicked Deploy to Azure for Teams channel',
		description: 'The user clicked the Deploy to Azure button in the Teams channel setup.',
		properties: z.object({
			agent_id: z.string(),
			session_id: sessionId,
		}),
	},
	USER_DOWNLOADED_TEAMS_APP_PACKAGE: {
		name: 'User downloaded Teams app package',
		description: 'The user tried to download the Teams app package in the Teams channel setup.',
		properties: z.object({
			agent_id: z.string(),
			status: z.enum(['success', 'error']),
			session_id: sessionId,
		}),
	},
	USER_SELECTED_N8N_CHAT_AGENT: {
		name: 'User selected n8n chat agent',
		description:
			'The user picked a published agent to chat with over n8n Chat, from a card, the agents library, or the chat-page agent picker dropdown.',
		properties: z.object({
			agent_id: z.string(),
			source: z.enum(['card', 'library', 'dropdown']),
			variant: n8nChatVariant,
			session_id: sessionId,
		}),
	},
	USER_SENT_MESSAGE_TO_N8N_CHAT_AGENT: {
		name: 'User sent message to n8n chat agent',
		description: 'The user sent a chat message to a published agent over n8n Chat.',
		properties: z.object({
			agent_id: z.string(),
			thread_id: z.string(),
			is_new_thread: z.boolean(),
			variant: n8nChatVariant,
			session_id: sessionId,
		}),
	},
	USER_CLICKED_N8N_CHAT_SIDEBAR_ITEM: {
		name: 'User clicked n8n chat sidebar item',
		description:
			'The user clicked a "New chat" or existing-chat item in the sidebar\'s n8n Chat section.',
		properties: z.discriminatedUnion('item', [
			z.object({
				item: z.literal('new_chat'),
				variant: n8nChatVariant,
				session_id: sessionId,
			}),
			z.object({
				item: z.literal('chat'),
				chat_type: z.enum(['assistant', 'agent']),
				variant: n8nChatVariant,
				session_id: sessionId,
			}),
		]),
	},
});
