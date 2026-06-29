/**
 * Preconfigured Workflow Discovery Tool
 *
 * Spawns a focused, synchronous sub-agent that inventories the nodes and
 * credentials a build needs, gathers relevant knowledge-base techniques (when a
 * sandbox workspace is attached), and returns the relevant node type definitions
 * verbatim (selection only, no summarizing). Unlike free-form `delegate`, the
 * role, system prompt, and tool subset are fixed here so pre-build discovery is
 * consistent and testable. Sandbox `workspace_*` tools attach automatically when
 * a sandbox exists, giving the sub-agent knowledge-base read access.
 *
 * Runs synchronously: the result is returned to the orchestrator in the same
 * turn, which then loads `workflow-builder` and builds with that context.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { runSyncSubAgent } from './delegate.tool';
import { DISCOVER_WORKFLOW_CONTEXT_PROMPT } from './discover-workflow-context.prompt';
import { createToolRegistry, toolRegistryKeys } from '../../tool-registry';
import type { OrchestrationContext } from '../../types';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../tool-ids';

const DISCOVERY_ROLE = 'workflow-context-scout';

/** Native domain tools the discovery sub-agent may use, in priority order. */
const DISCOVERY_TOOL_NAMES = [
	DOMAIN_TOOL_IDS.NODES,
	DOMAIN_TOOL_IDS.CREDENTIALS,
	DOMAIN_TOOL_IDS.RESEARCH,
] as const;

export const discoverWorkflowContextInputSchema = z.object({
	services: z
		.array(z.string().min(1))
		.min(1)
		.describe(
			'External services / integrations the workflow will touch, as short node-search terms (e.g. ["Gmail", "Google Sheets", "OpenAI"]). The scout finds the right nodes and credential types for each.',
		),
	categories: z
		.array(z.string().min(1))
		.optional()
		.describe(
			'Optional workflow technique categories to anchor node suggestions (e.g. ["form_input", "content_generation", "data_persistence"]).',
		),
	conversationContext: z
		.string()
		.optional()
		.describe(
			'Brief summary of the build goal and any user constraints (named accounts, channels, tables, required node families). The scout uses this to scope discovery.',
		),
});

export type DiscoverWorkflowContextInput = z.infer<typeof discoverWorkflowContextInputSchema>;

function buildDiscoveryBriefing(input: DiscoverWorkflowContextInput): string {
	const lines = [
		'Discover the nodes, credentials, and type definitions needed to build a workflow.',
		'',
		`Services to cover: ${input.services.join(', ')}.`,
	];
	if (input.categories?.length) {
		lines.push(`Workflow categories: ${input.categories.join(', ')}.`);
	}
	lines.push(
		'',
		'For each service: identify the exact node type(s) with their resource/operation/mode discriminators, record the credential type(s) plus whether a usable credential already exists, gather relevant knowledge-base techniques when sandbox workspace tools are attached, and return the relevant node type definitions verbatim. Follow the output contract in your instructions — do not summarize the type definitions.',
	);
	return lines.join('\n');
}

export function createDiscoverWorkflowContextTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.DISCOVER_WORKFLOW_CONTEXT)
		.description(
			'Run pre-build discovery: spawn a focused sub-agent that inventories the ' +
				'nodes and credentials for the given services, gathers relevant ' +
				'knowledge-base techniques (when a sandbox workspace is attached), and ' +
				'returns the relevant node type definitions verbatim (it selects the ' +
				'relevant types, it does not summarize them). This is the single pre-build ' +
				'discovery route for nodes, credentials, knowledge base, and types — call ' +
				'it BEFORE loading `workflow-builder` for any build touching external ' +
				'services or unfamiliar nodes, then build with the returned context. Runs ' +
				'synchronously — act on the result in the same turn. Does not build, ' +
				'patch, or run workflows.',
		)
		.input(discoverWorkflowContextInputSchema)
		.output(z.object({ result: z.string() }))
		.handler(async (input: DiscoverWorkflowContextInput) => {
			const validTools = createToolRegistry();
			for (const name of DISCOVERY_TOOL_NAMES) {
				const tool = context.domainTools.get(name);
				if (tool) {
					validTools.set(name, tool);
				}
			}

			if (!validTools.has(DOMAIN_TOOL_IDS.NODES)) {
				return {
					result:
						'Discovery failed: the `nodes` tool is not available, so node/type discovery cannot run.',
				};
			}

			const { result } = await runSyncSubAgent(context, {
				role: DISCOVERY_ROLE,
				instructions: DISCOVER_WORKFLOW_CONTEXT_PROMPT,
				briefing: buildDiscoveryBriefing(input),
				validTools,
				toolNames: toolRegistryKeys(validTools),
				conversationContext: input.conversationContext,
			});

			return { result };
		})
		.build();
}
