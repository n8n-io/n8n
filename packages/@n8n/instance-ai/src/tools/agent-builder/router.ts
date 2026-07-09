/**
 * agent_builder — a single router tool wrapping all agent-builder actions behind
 * an `action` discriminator. This keeps the agent's tool surface small (one tool
 * instead of ~16). There are no interactive picker tools — user input goes
 * through the native `ask-user` tool, and credentials are read via the native
 * `credentials` tool (action `list`).
 *
 * The router builds the underlying tools via their factories and derives its
 * input schema from each tool's own `inputSchema` (single source of truth — no
 * duplicated schemas). On dispatch it re-validates the input against the matched
 * tool's strict schema before calling its handler.
 */
import { Tool, type BuiltTool } from '@n8n/agents';
import { formatZodErrors } from '@n8n/api-types';
import { z } from 'zod';

import { createBuildAgentTool } from './build-agent.tool';
import { createReadConfigTool } from './config-tools';
import { createCreateAgentTool } from './create-agent.tool';
import {
	createBuildCustomToolTool,
	createCreateSkillTool,
	createCreateTaskTool,
	createListAgentsTool,
	createListIntegrationTypesTool,
	createListSubAgentsTool,
	createListWorkflowsTool,
} from './creation-tools';
import { createSearchMcpServersTool, createVerifyMcpServerTool } from './mcp-tools';
import {
	createGetNodeTypesTool,
	createGetResourceLocatorOptionsTool,
	createSearchNodesTool,
} from './node-tools';
import { createResolveLlmTool } from './resolve-llm.tool';
import type { InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

/** Factories for the non-interactive tools the router wraps (action = tool name). */
const ROUTER_TOOL_FACTORIES = [
	createCreateAgentTool,
	createReadConfigTool,
	createBuildAgentTool,
	createSearchNodesTool,
	createGetNodeTypesTool,
	createGetResourceLocatorOptionsTool,
	createCreateSkillTool,
	createCreateTaskTool,
	createBuildCustomToolTool,
	createListIntegrationTypesTool,
	createListSubAgentsTool,
	createListAgentsTool,
	createListWorkflowsTool,
	createSearchMcpServersTool,
	createVerifyMcpServerTool,
	createResolveLlmTool,
];

function isZodObject(schema: unknown): schema is z.ZodObject<z.ZodRawShape> {
	return schema instanceof z.ZodObject;
}

export function createAgentBuilderRouterTool(context: InstanceAiContext): BuiltTool {
	const builtTools = ROUTER_TOOL_FACTORIES.map((factory) => factory(context));
	const toolsByAction = new Map<string, BuiltTool>(builtTools.map((tool) => [tool.name, tool]));

	// Merge every wrapped tool's fields into one flat input (all optional, since
	// each call uses only one action's fields). Per-action strictness is enforced
	// at dispatch by re-validating against the matched tool's own schema.
	const mergedShape: z.ZodRawShape = {};
	for (const tool of builtTools) {
		if (!isZodObject(tool.inputSchema)) continue;
		for (const [key, value] of Object.entries(tool.inputSchema.shape)) {
			mergedShape[key] ??= value.optional();
		}
	}

	const actions = builtTools.map((tool) => tool.name);
	const inputSchema = z.object({
		action: z.string().describe(`The agent-builder action to run. One of: ${actions.join(', ')}.`),
		...mergedShape,
	});

	// The router is the only registered tool, so the runtime only injects ITS
	// `systemInstruction`. The wrapped tools (e.g. create_skill / create_task)
	// carry their own guidance, which would otherwise be dropped — collect it and
	// attach it here, keyed by action so each rule stays actionable.
	const wrappedInstructions = builtTools
		.flatMap((tool) => {
			const instruction = tool.systemInstruction?.trim();
			return instruction ? [`${tool.name}: ${instruction}`] : [];
		})
		.join('\n');

	return new Tool(AGENT_BUILDER_TOOL_IDS.AGENT_BUILDER)
		.description(
			'Build and configure a target n8n Agent. Pass `action` plus that action’s fields. ' +
				'Only use this tool when the user is explicitly creating or editing an n8n Agent — never ' +
				'while building or editing a workflow (use the workflow-builder skill and build-workflow ' +
				'for that), and never to fabricate file/utility tools during a workflow build. Actions: ' +
				'create_agent (create the agent first if none exists), read_config (read the persisted ' +
				'agent JSON config + configHash), build_agent (validate and persist the config from a ' +
				'workspace JSON file), search_nodes / get_node_types / ' +
				'get_resource_locator_options (node tools), create_skill, create_task, build_custom_tool, ' +
				'list_integration_types, list_sub_agents, list_agents, list_workflows, ' +
				'search_mcp_servers, verify_mcp_server, resolve_llm. To ask the user anything (a choice, ' +
				'which credential, which model) use the native `ask-user` tool; to list credentials use ' +
				'the native `credentials` tool (action `list`).',
		)
		.systemInstruction(wrappedInstructions)
		.input(inputSchema)
		.handler(async (input, ctx) => {
			const tool = toolsByAction.get(input.action);
			if (!tool?.handler) {
				return {
					ok: false as const,
					errors: [
						{
							message: `Unknown agent_builder action "${input.action}". Valid: ${actions.join(', ')}.`,
						},
					],
				};
			}
			// Re-validate against the action's strict schema (the flat input made
			// every field optional) before dispatching.
			if (isZodObject(tool.inputSchema)) {
				const parsed = tool.inputSchema.safeParse(input);
				if (!parsed.success) {
					return { ok: false as const, errors: formatZodErrors(parsed.error) };
				}
				return await tool.handler(parsed.data, ctx);
			}
			return await tool.handler(input, ctx);
		})
		.build();
}
