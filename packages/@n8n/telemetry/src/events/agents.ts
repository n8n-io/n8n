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
	skill_load_count_sum: z
		.number()
		.optional()
		.describe(
			'Successful `load_skill` calls that activated a skill. A read of a linked file does not count. Absent on rows before CONTEXT-335',
		),
	loaded_skill_ids: z
		.array(z.string())
		.optional()
		.describe(
			'Distinct ids of the skills those calls activated, sorted. Join to "User created skill" for the scope. Absent on rows before CONTEXT-335',
		),
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

const pushRef = z.string().describe('Editor push reference (pushRef)');

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
	'description',
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
	skill_ids: z
		.array(z.string())
		.optional()
		.describe(
			'Ids of the attached skills, sorted. Join to "User created skill" for the scope, to tell a shared skill from an agent-local one. Absent on rows before CONTEXT-335',
		),
	sub_agent_count: z.number(),
	mcp_server_count: z.number(),
	vector_store_count: z.number(),
	task_count: z.number(),
	trigger_count: z.number(),
	model: z.string().nullable(),
	tool_types: z.array(z.string()).describe('Tool types, never user-authored tool names'),
};

/** Present when the builder write or publish ran inside an n8n Assistant thread. */
const builderWriteSession = {
	thread_id: z
		.string()
		.optional()
		.describe('Instance AI thread hosting the builder session. Absent on rows before CONTEXT-335'),
	run_id: z
		.string()
		.optional()
		.describe('Instance AI run that made the change. Absent on rows before CONTEXT-335'),
};

const agentKnowledgeModification = {
	vector_store_fingerprints: z
		.array(z.string())
		.optional()
		.describe(
			'Codes that identify the knowledge sources connected to the agent after a change. Each code is a keyed hash of the provider and source name, and of the Pinecone namespace when one is set, with a key that is different for each instance. In one instance, the same provider and source name produce the same code, even across different accounts. The list contains each code once. An empty list means no sources remain. This field is sent when the vector store settings change, also when the connected sources stay the same.',
		),
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

const n8nChatHint = z
	.enum(['channel_chip', 'new_chat_sidebar'])
	.describe('Which n8n Chat hint popover the event is about');

const agentPublish = {
	...agentActorIdentity,
	...agentCapabilityProfile,
	trigger: agentPublishTrigger,
	version_id: z.string().describe('AgentHistory versionId that became active'),
	knowledge_file_count: z
		.number()
		.optional()
		.describe(
			'Knowledge files of the agent at publish time. Files have no versions. Absent when the server could not read the files.',
		),
	knowledge_total_bytes: z
		.number()
		.optional()
		.describe(
			'Sum of the original sizes of the knowledge files at publish time. Absent when the server could not read the files.',
		),
};

/** Upload checks that the editor makes before it sends the files. */
const knowledgeUploadClientFailureReason = z.enum(['file_size', 'too_many_files', 'total_limit']);

/** Upload checks that the server makes. `unknown` covers every other error. */
const knowledgeUploadServerFailureReason = z.enum([
	'file_type',
	'file_size',
	'too_many_files',
	'total_limit',
	'duplicate_name',
	'pdf_no_text',
	'invalid_file_name',
	'unknown',
]);

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
	AGENT_WHATSAPP_WEBHOOK_VERIFIED: {
		name: 'Agent WhatsApp webhook verified',
		description:
			'Meta completed the webhook handshake with an agent: its callback URL is reachable and the verify token matched. Shows how many WhatsApp setups get past the Meta webhook step. Meta repeats the handshake each time someone clicks Verify and save, so one agent can emit this more than once.',
		properties: z.object({
			agent_id: z.string(),
			phase: z
				.enum(['setup', 'connected'])
				.describe(
					'setup: the channel was not connected yet, so n8n answered without a credential; connected: the running channel answered, which is a re-verification',
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
			trigger_count: z
				.number()
				.describe(
					'Configured chat integrations; draft channels and n8n Chat excluded, because new agents get n8n Chat by default',
				),
			status: agentStatus,
		}),
	},
	AGENT_RUN_USED_KNOWLEDGE: {
		name: 'Agent run used knowledge',
		description:
			'Sent when an agent run ends, if the agent used its knowledge files or vector stores at least once in that run. A run without knowledge use sends no event. A run that pauses for an approval and then resumes sends one event for each part, with the same run_id, so count distinct run_id values to count runs.',
		properties: z.object({
			agent_id: z.string(),
			run_id: z.string().describe('Run id of the agent runtime'),
			run_type: agentRunType,
			user_id: z
				.string()
				.optional()
				.describe('Absent for runs without an n8n user, such as some chat integrations'),
			file_find_count: z.number().describe('Calls that listed knowledge files by name'),
			file_search_count: z.number().describe('Calls that searched text inside knowledge files'),
			file_read_count: z.number().describe('Calls that read part of a knowledge file'),
			vector_store_search_count: z.number().describe('Searches in any vector store of the agent'),
			file_content_chars: z
				.number()
				.describe(
					'Characters that successful knowledge file tool calls sent to the model in the run. Failed calls add nothing. A result over 50,000 tokens counts in full, but the model gets a shorter version.',
				),
			vector_store_content_chars: z
				.number()
				.describe(
					'Characters that successful vector store searches sent to the model in the run. Counted like file_content_chars.',
				),
			file_failed_count: z
				.number()
				.describe('Knowledge file tool calls that failed. Each one also counts in its call count'),
			vector_store_failed_count: z
				.number()
				.describe(
					'Vector store searches that failed. Each one also counts in vector_store_search_count',
				),
			file_age_days_min: z
				.number()
				.optional()
				.describe(
					'Age in full days, when the run ends, of the newest knowledge file that read_file read successfully. Absent when the run read no file.',
				),
			file_age_days_max: z
				.number()
				.optional()
				.describe(
					'Age in full days, when the run ends, of the oldest knowledge file that read_file read successfully. Absent when the run read no file.',
				),
			file_age_days_avg: z
				.number()
				.optional()
				.describe(
					'Average age in full days of the knowledge files that read_file read successfully, with one decimal. Each file counts once, also when the run read it more than once. Absent when the run read no file.',
				),
			file_age_days_median: z
				.number()
				.optional()
				.describe(
					'Median age of the knowledge files that read_file read successfully. Each file counts once, and each age is in full days. With an even number of files, the median is the average of the two middle ages, so it can end in .5. Absent when the run read no file.',
				),
			file_age_days_first_25: z
				.array(z.number())
				.optional()
				.describe(
					'Ages in full days of the first 25 different knowledge files that read_file read successfully, in the order of their first read. Absent when the run read no file.',
				),
			file_search_duration_ms_avg: z
				.number()
				.optional()
				.describe(
					'Average duration of the finished search_text calls, failed ones included. Includes sandbox start and file copy. Absent when no call finished.',
				),
			file_search_duration_ms_max: z
				.number()
				.optional()
				.describe(
					'Duration of the slowest finished search_text call. Absent when no call finished.',
				),
			file_empty_search_count: z
				.number()
				.optional()
				.describe(
					'Finished search_text calls that worked and found nothing. Absent when no call finished.',
				),
			file_error_types: z
				.array(z.string())
				.optional()
				.describe(
					'Error names of the failed search_text calls, each name once. Absent when no call finished.',
				),
			vector_store_search_duration_ms_avg: z
				.number()
				.optional()
				.describe(
					'Average duration of the finished vector store searches, failed ones included. Absent when no search finished.',
				),
			vector_store_search_duration_ms_max: z
				.number()
				.optional()
				.describe(
					'Duration of the slowest finished vector store search. Absent when no search finished.',
				),
			vector_store_empty_search_count: z
				.number()
				.optional()
				.describe(
					'Finished vector store searches that worked and found nothing. Absent when no search finished.',
				),
			vector_store_error_types: z
				.array(z.string())
				.optional()
				.describe(
					'Error names of the failed vector store searches, each name once. Absent when no search finished.',
				),
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
	AGENT_KNOWLEDGE_SNAPSHOT: {
		name: 'Agent knowledge snapshot',
		description:
			'Daily count of the published agents of the instance and the knowledge they use. One event per instance, sent by one main instance only. An instance without published agents sends no event. A vector store counts only when it is in the published version of the agent. Knowledge files have no versions, so the file counts are the current files of each published agent. Includes agents published before this event existed. Each event carries totals, not increments: do not sum snapshots over time; take the latest one for each instance in a window.',
		properties: z.object({
			published_agent_count: z.number(),
			published_with_files_count: z
				.number()
				.describe('Published agents with at least one knowledge file'),
			published_with_vector_stores_count: z
				.number()
				.describe('Published agents with at least one vector store in the published version'),
			published_with_both_count: z
				.number()
				.describe('Published agents with knowledge files and vector stores'),
			knowledge_file_count: z.number().describe('Knowledge files of all published agents'),
			knowledge_total_bytes: z
				.number()
				.describe('Sum of the original sizes of the knowledge files of all published agents'),
			vector_store_count: z.number().describe('Vector stores in all published versions'),
			vector_store_providers: z
				.record(z.string(), z.number())
				.describe('Vector stores for each provider, for example { pinecone: 3, qdrant: 1 }'),
		}),
	},
	BUILDER_CREATED_AGENT: {
		name: 'Builder created agent',
		description:
			'The Instance AI builder persisted a new Agent. Emitted after the Agent and its initial configuration commit, including incomplete drafts. A later build failure does not undo creation. Union the user, builder, and MCP creation events to count all new Agents. Adoption of an existing Agent emits no creation event. Version 3 reports the committed insert instead of the first configuring update.',
		properties: z.object({
			...agentWrite,
			...builderWriteSession,
			event_version: z.literal('3'),
		}),
	},
	USER_CREATED_AGENT: {
		name: 'User created agent',
		description:
			'A user persisted a new Agent from the editor, a template, duplication, or a package import. Emitted after the Agent and its initial configuration commit, regardless of its default model or setup readiness. Package imports have no matching click event. Union the user, builder, and MCP creation events to count all new Agents. User clicked new agent joins through agent_id. User duplicated agent retains the source Agent context. Version 3 reports the committed insert instead of the first configuring update.',
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
			'A user saved a tracked configuration or resource change to an existing Agent through the editor or a package import. Emitted after the change commits. Incomplete Agents also count. No-op and cosmetic-only saves emit nothing. Creation emits User created agent instead. The profile describes the saved configuration. Version 2 removes the configured-state gate and creation inference.',
		properties: z.object({
			...agentWrite,
			...agentKnowledgeModification,
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
			...builderWriteSession,
			...agentKnowledgeModification,
			event_version: z.literal('2'),
		}),
	},
	MCP_MODIFIED_AGENT: {
		name: 'MCP modified agent',
		description:
			'An MCP client saved a tracked configuration or resource change to an existing Agent through mutate_agent. Emitted after the change commits. Incomplete Agents also count. No-op and cosmetic-only saves emit nothing. Creation emits MCP created agent instead. User called mcp tool also reports the tool call. Version 2 removes the configured-state gate and creation inference.',
		properties: z.object({
			...agentWrite,
			...agentKnowledgeModification,
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
			...builderWriteSession,
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
			...builderWriteSession,
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
			action: z
				.enum(['got_it', 'talk_to_agent', 'closed'])
				.optional()
				.describe(
					'How the modal closed: the Got it button, the Talk to agent button (opens the agent in n8n Chat), or the close icon or Escape',
				),
			n8n_chat_live: z
				.boolean()
				.optional()
				.describe('Whether the published version carries the n8n Chat channel'),
			push_ref: pushRef.optional(),
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
	BUILDER_REMOVED_TRIGGER: {
		name: 'Builder removed trigger from agent',
		description:
			'The Instance AI builder saved a config through agent_builder_write_config or agent_builder_patch_config that removed a configured chat channel. One event fires for each removed channel type, after the save commits. Mirrors the frontend "User removed trigger from agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			trigger_type: z.string().describe('Chat integration type that was removed'),
			triggers: z.array(z.string()).describe('Configured trigger types after the change'),
		}),
	},
	BUILDER_ASKED_QUESTIONS: {
		name: 'Builder asked questions',
		description:
			'The Instance AI builder showed the questions step of agent_builder_finish_setup. Before Oct 2026 it also fired for the retired agent_builder_ask_questions tool.',
		properties: z.object({
			...builderSessionIdentity,
			question_count: z.number(),
			question_types: z.array(z.string()).describe('Distinct question types in the batch'),
		}),
	},
	USER_ANSWERED_BUILDER_QUESTIONS: {
		name: 'User answered builder questions',
		description:
			'The user answered, skipped, or dismissed the questions step of agent_builder_finish_setup. Before Oct 2026 it also fired for the retired agent_builder_ask_questions tool.',
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
			'The Agent builder requested credentials and suspended to show a credential picker card. Does not fire when the request auto-resolves without showing a card.',
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
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
		}),
	},
	USER_REMOVED_TRIGGER_FROM_AGENT: {
		name: 'User removed trigger from agent',
		description:
			'The user removed a chat trigger from the agent builder, from the channel menu or the channel settings. Counterpart of "User added trigger to agent". No event fires when the channel stays configured after the removal.',
		properties: z.object({
			agent_id: z.string(),
			trigger_type: z.string(),
			triggers: z.array(z.string()).describe('Configured trigger types after the change'),
			config_version: z.string(),
			status: agentStatus,
			push_ref: pushRef,
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
			push_ref: pushRef,
		}),
	},
	USER_OPENED_AGENT_SKILL: {
		name: 'User opened agent skill',
		description: 'The user opened a skill from the builder capabilities list.',
		properties: z.object({
			agent_id: z.string(),
			skill_id: z.string(),
			push_ref: pushRef,
		}),
	},
	USER_OPENED_ADD_SKILL_MODAL: {
		name: 'User opened add skill modal',
		description: 'The user opened the add-skill modal in the builder.',
		properties: z.object({
			agent_id: z.string(),
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
		}),
	},
	USER_CLICKED_KNOWLEDGE_UPLOAD: {
		name: 'User clicked knowledge upload',
		description:
			'The user opened the knowledge file picker in the agent builder. Includes clicks followed by cancellation. Does not report selected files.',
		properties: z.object({
			agent_id: z.string(),
			push_ref: pushRef,
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
					'memory',
					'tool',
					'node',
					'workflow',
					'execution-error',
					'suspension',
					'hitl-response',
					'background-task-signal',
					'background-task',
				])
				.describe('Selected timeline item kind. Does not include item content.'),
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
		}),
	},
	USER_CLICKED_MORE_OPTIONS_FROM_TEST_PANEL: {
		name: 'User clicked more options from test panel',
		description:
			'The user opened the preview dock More menu. Excludes menu closure and metadata refresh.',
		properties: z.object({
			agent_id: z.string(),
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
		}),
	},
	USER_CLICKED_TRACE_DETAILS_FROM_TEST_PANEL: {
		name: 'User clicked trace details from test panel',
		description:
			'The user activated the enabled Trace details control in the agent preview. Fires before navigation, not after trace loading.',
		properties: z.object({
			agent_id: z.string(),
			push_ref: pushRef,
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
	USER_UPLOADED_AGENT_KNOWLEDGE_FILES: {
		name: 'User uploaded agent knowledge files',
		description:
			'The user uploaded one or more files to the knowledge of an agent. Fires once for each upload request that stored all of its files. A failed upload stores no files and sends "User failed agent knowledge upload" instead.',
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			user_id: z.string(),
			file_count: z.number(),
			total_bytes: z.number().describe('Sum of size_bytes for all files in the upload'),
			files: z.array(
				z.object({
					mime_type: z.string().describe('MIME type that the browser sent with the file'),
					content_hash: z
						.string()
						.optional()
						.describe(
							'Keyed hash of the original uploaded bytes, independent of the file name. The key is different for each instance, so the same file produces the same code only in one instance. Omitted if the telemetry hash could not be computed.',
						),
					size_bytes: z
						.number()
						.describe('Size of the original file, not of the stored text extracted from a PDF'),
				}),
			),
		}),
	},
	USER_OPENED_AGENT_KNOWLEDGE_TAB: {
		name: 'User opened agent knowledge tab',
		description:
			'The knowledge tab of the agent builder became the active tab, by a click or by opening a URL with the knowledge section. When the page opens on the tab, the event can fire before the agent finishes loading. First step of the knowledge funnel.',
		properties: z.object({
			agent_id: z.string(),
			push_ref: pushRef,
		}),
	},
	USER_STARTED_ADDING_AGENT_KNOWLEDGE: {
		name: 'User started adding agent knowledge',
		description:
			'The user chose files to upload to the knowledge of an agent, or opened the modal to add a vector store. Sent before any check. The success step is "User uploaded agent knowledge files" for files, and "User modified agent" with the vectorStores part for vector stores.',
		properties: z.object({
			agent_id: z.string(),
			kind: z.enum(['file', 'vector_store']),
			file_count: z.number().optional().describe('Files chosen. Only for kind file.'),
			push_ref: pushRef,
		}),
	},
	USER_FAILED_AGENT_KNOWLEDGE_UPLOAD: {
		name: 'User failed agent knowledge upload',
		description:
			'A file upload to the knowledge of an agent was rejected. stage client: the editor rejected it before sending. stage server: the server rejected it, and sent no files. When only some chosen files are too large, the editor reports a client file_size failure and still uploads the other files, so the same upload can also send "User uploaded agent knowledge files".',
		properties: z.discriminatedUnion('stage', [
			z.object({
				stage: z.literal('client'),
				agent_id: z.string(),
				file_count: z.number().describe('Files rejected by the check'),
				reason: knowledgeUploadClientFailureReason,
				push_ref: pushRef,
			}),
			z.object({
				stage: z.literal('server'),
				agent_id: z.string(),
				project_id: z.string(),
				user_id: z.string(),
				file_count: z
					.number()
					.describe(
						'Files that the server received in the rejected request. The server stores none of them. When the server rejects a file while it reads the request, the count does not include that file or any file after it.',
					),
				reason: knowledgeUploadServerFailureReason,
			}),
		]),
	},
	USER_REMOVED_AGENT_KNOWLEDGE: {
		name: 'User removed agent knowledge',
		description:
			'The server deleted one knowledge file of an agent at the request of a user. Not sent when the agent itself is deleted. Removing a vector store sends "User modified agent" with the vectorStores part instead.',
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			user_id: z.string(),
		}),
	},
	USER_STARTED_AGENT_CHANNEL_SETUP: {
		name: 'User started agent channel setup',
		description:
			'The setup view of a chat channel became visible in the agent channel modal. Pairs with "User closed agent channel setup" to measure the setup funnel.',
		properties: z.object({
			agent_id: z.string(),
			channel_type: z.string(),
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
		}),
	},
	USER_CHECKED_WHATSAPP_CHANNEL_CREDENTIAL: {
		name: 'User checked WhatsApp channel credential',
		description:
			'The WhatsApp channel setup checked the selected credential against Meta. Runs on its own whenever the selected credential changes, and when the user clicks Check again. Shows why credentials fail on the way to a connected channel.',
		properties: z.object({
			agent_id: z.string(),
			trigger: z
				.enum(['auto', 'recheck'])
				.describe('auto: the selected credential changed; recheck: the user clicked Check again'),
			status: z.enum(['ok', 'failed']),
			reason: z
				.enum([
					'incomplete',
					'temporary_token',
					'mismatch',
					'unreachable',
					'not_found',
					'request_failed',
					'save_failed',
				])
				.optional()
				.describe(
					'Only when status is failed. not_found: the user cannot use that credential; request_failed: the request to n8n failed, so Meta was never asked; save_failed: n8n could not save the new agent, so no check ran',
				),
			push_ref: pushRef,
		}),
	},
	USER_CLICKED_WHATSAPP_CHANNEL_LINK: {
		name: 'User clicked WhatsApp channel link',
		description:
			'The user clicked a link in the WhatsApp channel setup or settings that leaves n8n for Meta. Shows where people go to Meta, and whether they need to go back for something the setup could have told them.',
		properties: z.object({
			agent_id: z.string(),
			target: z
				.enum(['meta_dashboard', 'whatsapp_manager', 'meta_app'])
				.describe(
					'meta_dashboard: Open Meta App Dashboard in the setup; whatsapp_manager: Edit in WhatsApp Manager in the settings; meta_app: Find your Meta app in the settings',
				),
			push_ref: pushRef,
		}),
	},
	USER_CLICKED_DEPLOY_TO_AZURE_FOR_TEAMS_CHANNEL: {
		name: 'User clicked Deploy to Azure for Teams channel',
		description: 'The user clicked the Deploy to Azure button in the Teams channel setup.',
		properties: z.object({
			agent_id: z.string(),
			push_ref: pushRef,
		}),
	},
	USER_DOWNLOADED_TEAMS_APP_PACKAGE: {
		name: 'User downloaded Teams app package',
		description: 'The user tried to download the Teams app package in the Teams channel setup.',
		properties: z.object({
			agent_id: z.string(),
			status: z.enum(['success', 'error']),
			push_ref: pushRef,
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
			push_ref: pushRef,
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
			push_ref: pushRef,
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
				push_ref: pushRef,
			}),
			z.object({
				item: z.literal('chat'),
				chat_type: z.enum(['assistant', 'agent']),
				variant: n8nChatVariant,
				push_ref: pushRef,
			}),
		]),
	},
	USER_VIEWED_N8N_CHAT_HINT: {
		name: 'User viewed n8n chat hint',
		description:
			'A one-time n8n Chat hint popover opened. `new_chat_sidebar` points at the sidebar "New chat" item on the user\'s first visit, on any page. `channel_chip` shows on the n8n Chat channel chip in the agent builder while the agent is available in n8n Chat, which new agents are by default; it waits until `new_chat_sidebar` is dismissed. Each hint shows until the user dismisses it once.',
		properties: z.object({
			hint: n8nChatHint,
			agent_id: z.string().optional().describe('The agent on screen; absent for new_chat_sidebar'),
			variant: n8nChatVariant,
			push_ref: pushRef,
		}),
	},
	USER_DISMISSED_N8N_CHAT_HINT: {
		name: 'User dismissed n8n chat hint',
		description:
			'The user closed a one-time n8n Chat hint popover with its Got it button, the only way to close it. Pairs with "User viewed n8n chat hint" on `hint`. A dismissed hint does not show again.',
		properties: z.object({
			hint: n8nChatHint,
			agent_id: z.string().optional().describe('The agent on screen; absent for new_chat_sidebar'),
			variant: n8nChatVariant,
			push_ref: pushRef,
		}),
	},
});
