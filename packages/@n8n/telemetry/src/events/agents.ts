import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const agentPublishSource = z
	.enum(['editor', 'builder', 'channel_connect', 'slack_setup'])
	.describe('Which surface triggered the publish');

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

// The builder config-diff events capture status before the write, so a change
// to a live agent reports 'production'. The frontend "User added/removed …"
// twins derive status after the save — which always produces a new draft
// version — so they effectively always report 'draft'. Warehouse consumers
// unioning the twins must not group by status across sources.
const builderPreWriteStatus = agentStatus.describe(
	"Agent status before the builder's write (frontend twin events report post-save status, effectively always 'draft')",
);

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

export const AGENTS_TELEMETRY = defineTelemetryEvents({
	AGENT_PUBLISHED: {
		name: 'Agent published',
		description:
			'An agent version became the active published version, from any surface (editor Publish button, builder publish_agent tool, chat-channel connect auto-publish, or Slack app setup auto-publish). Does not fire for idempotent no-op publishes.',
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			user_id: z.string(),
			source: agentPublishSource,
			version_id: z.string().describe('AgentHistory versionId that became active'),
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
			trigger_count: z.number().describe('Connected chat integrations; draft channels excluded'),
			status: agentStatus,
		}),
	},
	AGENT_UNPUBLISHED: {
		name: 'Agent unpublished',
		description:
			'An agent was unpublished, clearing its active version, from either the editor Unpublish button or the builder unpublish_agent tool.',
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			user_id: z.string(),
			source: z.enum(['editor', 'builder']),
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
			'The Instance AI builder created an agent through its delegate. Only fires inside a thread context; the frontend "User created agent" twin covers the UI create paths.',
		properties: z.object({
			agent_id: z.string(),
			project_id: z.string(),
			thread_id: z.string().describe('Instance AI thread hosting the builder session'),
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
	BUILDER_ADDED_TOOLS: {
		name: 'Builder added tools to agent',
		description:
			'The Instance AI builder saved an agent config that added a tool, mirroring the frontend "User added tools to agent" event so both sources can be aggregated together.',
		properties: z.object({
			...builderSessionIdentity,
			tool_added: z.string().describe('Identifier of the newly added tool'),
			tools: z.array(z.string()).describe('Full tool identifier list after the save'),
			status: builderPreWriteStatus,
		}),
	},
	BUILDER_ADDED_SKILLS: {
		name: 'Builder added skills to agent',
		description:
			'The Instance AI builder saved an agent config that added a skill, mirroring the frontend "User added skills to agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			skill_added: z.string().describe('Identifier of the newly added skill'),
			skills: z.array(z.string()).describe('Full skill identifier list after the save'),
			status: builderPreWriteStatus,
		}),
	},
	BUILDER_ADDED_TASKS: {
		name: 'Builder added tasks to agent',
		description:
			'The Instance AI builder saved an agent config that added a scheduled task, mirroring the frontend "User added tasks to agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			task_added: z.string().describe('Identifier of the newly added task'),
			tasks: z.array(z.string()).describe('Full task identifier list after the save'),
			status: builderPreWriteStatus,
		}),
	},
	BUILDER_REMOVED_TASKS: {
		name: 'Builder removed tasks from agent',
		description:
			'The Instance AI builder saved an agent config that removed a scheduled task, mirroring the frontend "User removed tasks from agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			task_removed: z.string().describe('Identifier of the removed task'),
			tasks: z.array(z.string()).describe('Full task identifier list after the save'),
			status: builderPreWriteStatus,
		}),
	},
	BUILDER_ADDED_TRIGGER: {
		name: 'Builder added trigger to agent',
		description:
			'The Instance AI builder connected a chat channel to the target agent via the configure_channel tool, mirroring the frontend "User added trigger to agent" event.',
		properties: z.object({
			...builderSessionIdentity,
			trigger_type: z.string().describe('Chat integration type that was connected'),
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
		description: 'The user clicked a new-agent entry point (button, dropdown, or card).',
		properties: z.object({
			source: z.enum(['button', 'dropdown', 'card']),
			session_id: sessionId,
		}),
	},
	USER_CREATED_AGENT: {
		name: 'User created agent',
		description:
			'A draft agent was created, from the blank new-agent page or inline from a workflow surface (source carries the entry point).',
		properties: z.object({
			agent_id: z.string(),
			source: z.string(),
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
	USER_EDITED_AGENT_CONFIG: {
		name: 'User edited agent config',
		description: 'A builder autosave persisted a config edit; one event fires per changed part.',
		properties: z.object({
			agent_id: z.string(),
			part: z.enum([
				'instructions',
				'model',
				'memory',
				'tools',
				'skills',
				'triggers',
				'subAgents',
				'name',
				'description',
				'vectorStores',
			]),
			config_version: z.string(),
			status: agentStatus,
			credential_kind: z
				.enum(['n8n_credits', 'own'])
				.optional()
				.describe(
					'Which kind of model credential the agent now uses. Only set when part is "model".',
				),
			session_id: sessionId,
		}),
	},
	USER_ADDED_TRIGGER_TO_AGENT: {
		name: 'User added trigger to agent',
		description: 'The user connected a chat trigger to an agent from the builder.',
		properties: z.object({
			agent_id: z.string(),
			trigger_type: z.string(),
			triggers: z.array(z.string()).describe('Connected trigger types after the change'),
			config_version: z.string(),
			status: agentStatus,
			session_id: sessionId,
		}),
	},
	USER_ADDED_TOOLS_TO_AGENT: {
		name: 'User added tools to agent',
		description:
			'A saved builder config added a tool; one event fires per newly added tool. Twin of the backend "Builder added tools to agent" event.',
		properties: z.object({
			agent_id: z.string(),
			tool_added: z.string().describe('Identifier of the newly added tool'),
			tools: z.array(z.string()).describe('Full tool identifier list after the save'),
			config_version: z.string(),
			status: agentStatus,
			session_id: sessionId,
		}),
	},
	USER_ADDED_SKILLS_TO_AGENT: {
		name: 'User added skills to agent',
		description:
			'A saved builder config added a skill; one event fires per newly added skill. Twin of the backend "Builder added skills to agent" event.',
		properties: z.object({
			agent_id: z.string(),
			skill_added: z.string().describe('Identifier of the newly added skill'),
			skills: z.array(z.string()).describe('Full skill identifier list after the save'),
			config_version: z.string(),
			status: agentStatus,
			session_id: sessionId,
		}),
	},
	USER_ADDED_TASKS_TO_AGENT: {
		name: 'User added tasks to agent',
		description:
			'A saved builder config added a scheduled task; one event fires per newly added task. Twin of the backend "Builder added tasks to agent" event.',
		properties: z.object({
			agent_id: z.string(),
			task_added: z.string().describe('Identifier of the newly added task'),
			tasks: z.array(z.string()).describe('Full task identifier list after the save'),
			config_version: z.string(),
			status: agentStatus,
			session_id: sessionId,
		}),
	},
	USER_REMOVED_TASKS_FROM_AGENT: {
		name: 'User removed tasks from agent',
		description:
			'A saved builder config removed a scheduled task; one event fires per removed task. Twin of the backend "Builder removed tasks from agent" event.',
		properties: z.object({
			agent_id: z.string(),
			task_removed: z.string().describe('Identifier of the removed task'),
			tasks: z.array(z.string()).describe('Full task identifier list after the save'),
			config_version: z.string(),
			status: agentStatus,
			session_id: sessionId,
		}),
	},
	USER_PUBLISHED_AGENT: {
		name: 'User published agent',
		description: 'The user published an agent from the builder.',
		properties: z.object({
			agent_id: z.string(),
			config_version: z.string(),
			status: z.literal('production'),
			session_id: sessionId,
		}),
	},
	USER_UNPUBLISHED_AGENT: {
		name: 'User unpublished agent',
		description: 'The user unpublished an agent from the builder.',
		properties: z.object({
			agent_id: z.string(),
			status: z.literal('draft'),
			session_id: sessionId,
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
			'The user clicked Connect on an available row in the tools modal, starting a new tool flow.',
		properties: z.object({
			tool_type: z.enum(['custom', 'workflow', 'node']),
			source: z.literal('manual'),
			agent_id: optionalAgentId,
		}),
	},
	USER_ADDED_AGENT_TOOL: {
		name: 'User added agent tool',
		description:
			'A new tool ref or MCP server was saved to an agent for the first time from the tools modal.',
		properties: z.object({
			tool_type: z.enum(['custom', 'workflow', 'node', 'mcpServer']),
			has_approval: z.boolean(),
			...toolIdentity,
			authentication: z.string().optional().describe('MCP server auth method'),
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
	USER_REMOVED_AGENT_TOOL: {
		name: 'User removed agent tool',
		description:
			'The user confirmed removing a tool or MCP server from an agent (tools modal or sidebar).',
		properties: z.object({
			tool_type: z.enum(['custom', 'workflow', 'node', 'mcpServer']),
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
