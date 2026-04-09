import { Agent, Tool } from '@n8n/agents';
import type { CredentialProvider, CredentialListItem, StreamChunk } from '@n8n/agents';

import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { WorkflowBuilderToolsService } from '@/modules/mcp/tools/workflow-builder/workflow-builder-tools.service';

import { AgentSecureRuntime } from './agent-secure-runtime';
import type { AgentJsonConfig } from './agent-json-config';
import { AgentJsonConfigSchema, AgentJsonConfigPartialSchema } from './agent-json-config';
import { AgentsService } from './agents.service';

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly workflowBuilderToolsService: WorkflowBuilderToolsService,
	) {}

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		_userId?: string,
	): AsyncGenerator<StreamChunk> {
		const agent = await this.agentsService.findById(agentId, projectId);

		if (!agent) {
			throw new Error(`Agent "${agentId}" not found`);
		}

		await this.workflowBuilderToolsService.initialize();

		// Tool: create_agent_config — creates or replaces the agent configuration
		const createAgentConfigTool = new Tool('create_agent_config')
			.description(
				'Create or replace the agent configuration. Pass full configuration.' +
					'Returns { ok: true } on success or { ok: false, error } on validation failure.',
			)
			.input(z.object({ config: AgentJsonConfigSchema }))
			.handler(async (input) => {
				try {
					await this.agentsService.updateConfig(agentId, projectId, input.config);
					return { ok: true };
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : String(e) };
				}
			})
			.build();

		// Tool: update_agent_config — partially updates the agent configuration
		const updateAgentConfigTool = new Tool('update_agent_config')
			.description(
				'Update part of the agent configuration. Only pass the fields you want to change. ' +
					'To change arrays, pass the FULL array with the modified entry. ' +
					'Returns { ok: true, config } with the merged result.',
			)
			.input(z.object({ config: AgentJsonConfigPartialSchema }))
			.handler(async (partial) => {
				try {
					const result = await this.agentsService.patchConfig(agentId, projectId, partial.config);
					return { ok: true, config: result.config };
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : String(e) };
				}
			})
			.build();

		// Tool: build_custom_tool — validates and persists a custom tool
		const buildCustomToolTool = new Tool('build_custom_tool')
			.description(
				'Create or update a custom tool. Pass the tool ID and complete TypeScript source ' +
					'using `export default new Tool(...)` builder chain. The code is validated in a ' +
					'sandbox. On success the tool is added to the agent config automatically. ' +
					'Returns { ok: true, descriptor } or { ok: false, errors }.',
			)
			.input(
				z.object({
					id: z
						.string()
						.min(1)
						.regex(/^[a-z0-9_-]+$/)
						.describe('Tool ID (lowercase, underscores, hyphens)'),
					code: z
						.string()
						.describe('Complete TypeScript source using export default new Tool(...)'),
				}),
			)
			.handler(async ({ id, code }: { id: string; code: string }) => {
				try {
					const descriptor = await this.secureRuntime.describeToolSecurely(code);
					await this.agentsService.buildCustomTool(agentId, projectId, id, code, descriptor);
					return { ok: true, id, descriptor };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		// Tool: list_credentials — lists credentials accessible to the user
		const listCredentialsTool = new Tool('list_credentials')
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Call this BEFORE generating code to know which .credential() value to use.',
			)
			.input(z.object({}))
			.handler(async () => {
				const creds = await credentialProvider.list();
				return { credentials: creds };
			})
			.build();

		// Tool: list_workflows — lists workflows that can be used as tools (pre-filtered)
		const listWorkflowsTool = new Tool('list_workflows')
			.description(
				'List the n8n workflows that can be attached as tools via .tool(new WorkflowTool(name)) from @n8n/agents-utils. ' +
					'ALWAYS call this at the start — workflows are the preferred way to give agents real capabilities ' +
					'(sending emails, creating calendar events, querying databases, calling APIs, etc.). ' +
					'Only returns workflows with supported trigger types.',
			)
			.input(z.object({}))
			.handler(async () => {
				const workflows = await this.workflowRepository.find({
					select: ['id', 'name', 'nodes', 'active', 'updatedAt'],
					where: {
						shared: { projectId },
					},
					relations: ['shared'],
					order: { updatedAt: 'DESC' },
					take: 100,
				});

				const SUPPORTED_TRIGGERS: Record<string, string> = {
					'n8n-nodes-base.manualTrigger': 'manual',
					'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
					'n8n-nodes-base.chatTrigger': 'chat',
					'n8n-nodes-base.scheduleTrigger': 'schedule',
					'n8n-nodes-base.formTrigger': 'form',
				};

				const compatible = workflows
					.map((w) => {
						const triggerNode = (w.nodes ?? []).find(
							(n: { type: string }) => SUPPORTED_TRIGGERS[n.type],
						);
						if (!triggerNode) return null;
						return {
							name: w.name,
							active: w.active,
							triggerType: SUPPORTED_TRIGGERS[triggerNode.type],
						};
					})
					.filter(Boolean);

				return { workflows: compatible };
			})
			.build();

		// Tool: search_nodes — search for n8n nodes by name or service
		const searchNodesTool = new Tool('search_nodes')
			.description(
				'Search for n8n nodes by name or service. Use this to find nodes that can be added ' +
					'as node tools. Returns node IDs, display names, versions, and descriptions. ' +
					'After finding a node, call get_node_types to get its parameter schema.',
			)
			.input(
				z.object({
					queries: z
						.array(z.string())
						.min(1)
						.describe('Search queries (e.g., ["gmail", "slack", "http"])'),
				}),
			)
			.handler(async ({ queries }: { queries: string[] }) => {
				const results = await this.workflowBuilderToolsService.searchNodes(queries);
				return { results };
			})
			.build();

		// Tool: get_node_types — get detailed parameter schema for specific n8n nodes
		const getNodeTypesTool = new Tool('get_node_types')
			.description(
				'Get detailed parameter schema for specific n8n nodes. Use the node IDs returned ' +
					'by search_nodes. Returns parameter definitions needed to configure node tools. ' +
					'You can optionally filter by resource/operation/mode.',
			)
			.input(
				z.object({
					nodeIds: z
						.array(
							z.union([
								z.string(),
								z.object({
									nodeId: z.string(),
									version: z.string().optional(),
									resource: z.string().optional(),
									operation: z.string().optional(),
									mode: z.string().optional(),
								}),
							]),
						)
						.min(1)
						.describe('Node IDs from search_nodes (e.g., ["n8n-nodes-base.gmail"])'),
				}),
			)
			.handler(
				async ({
					nodeIds,
				}: {
					nodeIds: Array<
						| string
						| {
								nodeId: string;
								version?: string;
								resource?: string;
								operation?: string;
								mode?: string;
						  }
					>;
				}) => {
					const results = await this.workflowBuilderToolsService.getNodeTypes(nodeIds);
					return { results };
				},
			)
			.build();

		// Pick credential for the builder agent itself
		const availableCredentials = await credentialProvider.list();
		const LLM_CREDENTIAL_TYPES = ['anthropicApi', 'openAiApi'];
		const builderCredential =
			availableCredentials.find((c: CredentialListItem) => c.type === 'anthropicApi') ??
			availableCredentials.find((c: CredentialListItem) => LLM_CREDENTIAL_TYPES.includes(c.type));

		if (!builderCredential) {
			throw new Error(
				'No LLM credentials available. Add an Anthropic or OpenAI credential in n8n to use the builder agent.',
			);
		}

		let builderModel: string;
		switch (builderCredential.type) {
			case 'openAiApi':
				builderModel = 'openai/gpt-4o';
				break;
			case 'anthropicApi':
			default:
				builderModel = 'anthropic/claude-sonnet-4-5';
				break;
		}
		const currentConfig = agent.schema as unknown as AgentJsonConfig | null;
		const currentToolsMap = agent.tools ?? {};
		const toolList =
			Object.entries(currentToolsMap)
				.map(([id, t]) => `- ${id}: ${t.descriptor.name} -- ${t.descriptor.description}`)
				.join('\n') || '(none)';
		const configJson = currentConfig ? JSON.stringify(currentConfig, null, 2) : '(no config yet)';

		const builder = new Agent('agent-builder')
			.model(builderModel)
			.credential(builderCredential.name)
			.credentialProvider(credentialProvider)
			.instructions(
				`You are an expert agent builder. You help users create and configure AI agents by modifying a JSON configuration and building custom tools.

## Current agent config

\`\`\`json
${configJson}
\`\`\`

## Custom tools

${toolList}

## Workflow

1. FIRST call list_credentials, list_workflows to see what's available
2. When the user describes what they want, start with create_agent_config to set up the base config
3. PREFER attaching existing workflows(type: "workflow") or nodes(type: "node") as tools over custom tools -- workflows and nodes can interact with external services
4. If the user needs custom logic (data transformation, computation, etc.), use build_custom_tool
5. Use update_agent_config for incremental changes

## Agent config rules

- \`model\` must be "provider/model-name" format (e.g. "anthropic/claude-sonnet-4-5")
- \`credential\` must match an available credential name (call list_credentials first)
- \`memory.storage\` is a preset: "n8n" (recommended, persists in n8n DB), "sqlite", or "postgres"
- \`memory.lastMessages\` default: 20
- Use "n8n" as the default memory storage for all agents

## Tool types

### Workflow tools (preferred)
Reference existing n8n workflows by name. Call list_workflows to see available ones.
\`\`\`json
{ "type": "workflow", "workflow": "Send Welcome Email" }
\`\`\`

### Node tools
Run a single n8n node as a tool. Use search_nodes to find available nodes, then
get_node_types to see their parameters. Add the node to the config with nodeType,
nodeTypeVersion, and nodeParameters.

get_node_types return typescript references, but you must supply json fields in node config

Flow: search_nodes → get_node_types → create/update_agent_config

\`\`\`json
{
  "type": "node",
  "name": "http_request",
  "description": "Make an HTTP request to any URL",
  "node": {
    "nodeType": "n8n-nodes-base.httpRequest",
    "nodeTypeVersion": 4,
    "nodeParameters": {
      "method": "={{$json.method || 'GET'}}",
      "url": "={{$json.url}}"
    }
  },
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "The URL to request" },
      "method": { "type": "string", "description": "HTTP method (GET, POST, PUT, DELETE)" }
    },
    "required": ["url"]
  }
}
\`\`\`

Rules for node tools:
- \`nodeType\` and \`nodeTypeVersion\` come from get_node_types results
- \`nodeParameters\` sets fixed parameters (resource, operation, etc.) and pipes parameters from inputSchema using expressions "={{$json.paramName}}" where paramName must match parameter name in inputSchema.
- \`inputSchema\` defines what the LLM passes at runtime (JSON Schema)
- \`credentials\` maps credential slot names to credential IDs from list_credentials
- Use search_nodes first, never guess node type names

## n8n expressions

Node tool parameters inside \`nodeParameters\` can use n8n expressions to reference dynamic input.
The LLM input is available as \`$json\` — each key matches a property from \`inputSchema\`.

- \`={{ $json.fieldName }}\` — reference a field from the tool's input
- \`={{ $json.count > 0 ? 'yes' : 'no' }}\` — inline ternary
- \`={{ $json.items.join(', ') }}\` — call JS methods on input values
- \`={{ $now.toISO() }}\` — current date/time (Luxon DateTime)
- \`={{ $today }}\` — start of today (Luxon DateTime)

Always wrap expressions in \`={{ }}\`. Never use bare JS variables outside the braces.

### Custom tools
Write TypeScript using the Tool builder, validate via build_custom_tool.
\`\`\`json
{ "type": "custom", "id": "search_web" }
\`\`\`

The tool code must follow this pattern:
\`\`\`typescript
import { Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Tool('tool_name')
  .description('What the tool does')
  .input(z.object({ query: z.string() }))
  .handler(async ({ query }) => {
    return { result: query.toUpperCase() };
  });
\`\`\`

Rules for custom tool code:
- Must use \`export default new Tool(...)\` pattern
- Only imports: '@n8n/agents' and 'zod'
- Tool handlers are async, receive validated input
- Do NOT use process.env, fetch external URLs only if needed
- Do NOT call .build() -- the engine handles it

## Provider tools

Built-in provider capabilities (web search, image generation):
\`\`\`json
{ "providerTools": { "anthropic.web_search": { "maxUses": 5 } } }
\`\`\`

## Memory presets

| Storage | Description |
|---------|-------------|
| n8n     | Default. Persists in n8n database. No config needed. |
| sqlite  | Local SQLite file. Needs connection.path |
| postgres | PostgreSQL. Needs connection.credential |

## Available models

Use '${builderModel}' as the default unless the user specifies otherwise.

## Important

- Always call list_credentials first to pick the right credential
- Use search_nodes + get_node_types to discover nodes before adding node tools
- Prefer workflow tools and node tools over custom tools for real-world interactions
- Memory with storage "n8n" is the default -- always enable it unless told otherwise
- When modifying the tools array via update_agent_config, pass the FULL array`,
			)
			.tool(createAgentConfigTool)
			.tool(updateAgentConfigTool)
			.tool(buildCustomToolTool)
			.tool(listCredentialsTool)
			.tool(listWorkflowsTool)
			.tool(searchNodesTool)
			.tool(getNodeTypesTool);

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resultStream = await builder.stream(message);
		const reader = resultStream.stream.getReader();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				yield value;
			}
		} finally {
			reader.releaseLock();
		}
	}
}
