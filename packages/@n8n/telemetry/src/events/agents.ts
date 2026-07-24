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
