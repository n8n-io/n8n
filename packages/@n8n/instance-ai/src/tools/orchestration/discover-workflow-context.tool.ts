/**
 * Preconfigured Workflow Discovery Tool
 *
 * Spawns a focused, synchronous sub-agent that inventories the nodes and
 * credentials a build needs, gathers relevant knowledge-base techniques (when a
 * sandbox workspace is attached), and returns the relevant node type definitions
 * verbatim (selection only, no summarizing). This is a thin wrapper over the
 * `workflow-context-scout` sub-agent definition — the single, schema-validated
 * route to it (see `docs/subagents.md`; it is intentionally not reachable
 * through the generic `agent` delegate tool).
 *
 * Runs synchronously: the result is returned to the orchestrator in the same
 * turn, which then loads `workflow-builder` and builds with that context.
 */
import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { getSubAgentDefinition } from '../../subagents/registry';
import { runSubAgentDefinition } from '../../subagents/runner';
import { createToolRegistry } from '../../tool-registry';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../tool-ids';

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
		'For each service: identify the exact node type(s) with their resource/operation/mode discriminators, record the credential type(s) plus whether a usable credential already exists, gather relevant knowledge-base techniques when sandbox workspace tools are attached, and fetch the type definition for every node you recommend. Follow the output contract in your instructions.',
	);
	return lines.join('\n');
}

interface CapturedTypeDefinition {
	nodeType: string;
	version?: string | number;
	content: string;
	builderHint?: string;
}

/** Cache key for a single `type-definition` request — disambiguates split nodes by discriminator. */
function typeDefinitionCacheKey(request: unknown): string {
	if (typeof request === 'string') return request;
	if (isRecord(request) && typeof request.nodeType === 'string') {
		const { nodeType, resource, operation, mode } = request;
		return [nodeType, resource, operation, mode]
			.filter((part): part is string => typeof part === 'string')
			.join('::');
	}
	return JSON.stringify(request);
}

/**
 * Wrap the `nodes` tool so every `type-definition` call the scout makes is
 * captured verbatim into `capture`, keyed by request. The scout's instructions
 * tell it to fetch definitions only for the nodes it recommends, so this
 * capture doubles as the host's source of truth for the final result — the
 * scout no longer has to re-paste the content itself (see
 * `appendTypeDefinitions`).
 */
function wrapNodesToolForTypeDefinitionCapture(
	tools: InstanceAiToolRegistry,
	capture: Map<string, CapturedTypeDefinition>,
): InstanceAiToolRegistry {
	const nodesTool = tools.get(DOMAIN_TOOL_IDS.NODES);
	if (!nodesTool) return tools;

	const wrapped: BuiltTool = {
		...nodesTool,
		handler: async (input, ctx) => {
			const result = await nodesTool.handler?.(input, ctx);
			const definitions: unknown = isRecord(result) ? result.definitions : undefined;
			if (
				isRecord(input) &&
				input.action === 'type-definition' &&
				Array.isArray(input.nodeTypes) &&
				Array.isArray(definitions)
			) {
				input.nodeTypes.forEach((request: unknown, index: number) => {
					const definition: unknown = definitions[index];
					if (
						isRecord(definition) &&
						typeof definition.nodeType === 'string' &&
						typeof definition.content === 'string' &&
						definition.content
					) {
						capture.set(typeDefinitionCacheKey(request), {
							nodeType: definition.nodeType,
							...(typeof definition.version === 'string' || typeof definition.version === 'number'
								? { version: definition.version }
								: {}),
							content: definition.content,
							...(typeof definition.builderHint === 'string'
								? { builderHint: definition.builderHint }
								: {}),
						});
					}
				});
			}
			return result;
		},
	};

	const next = createToolRegistry(tools);
	next.set(DOMAIN_TOOL_IDS.NODES, wrapped);
	return next;
}

/** Append the host-captured, verbatim type definitions after the scout's (now compact) debrief. */
function appendTypeDefinitions(
	result: string,
	captured: Map<string, CapturedTypeDefinition>,
): string {
	if (captured.size === 0) return result;

	const blocks = Array.from(captured.values()).map(
		({ nodeType, version, content, builderHint }) => {
			const heading = version !== undefined ? `${nodeType} (v${version})` : nodeType;
			const hint = builderHint ? `\n\n${builderHint}` : '';
			return `### ${heading}\n\n${content}${hint}`;
		},
	);

	return `${result}\n\n## Type definitions\n\n${blocks.join('\n\n')}`;
}

function getWorkflowContextScoutDefinition() {
	const definition = getSubAgentDefinition('workflow-context-scout');
	if (!definition) {
		throw new Error(
			'"workflow-context-scout" sub-agent definition is not registered — this is a bug',
		);
	}
	return definition;
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
			if (!context.domainTools.has(DOMAIN_TOOL_IDS.NODES)) {
				return {
					result:
						'Discovery failed: the `nodes` tool is not available, so node/type discovery cannot run.',
				};
			}

			const capturedTypeDefinitions = new Map<string, CapturedTypeDefinition>();

			const { result } = await runSubAgentDefinition(
				getWorkflowContextScoutDefinition(),
				{
					briefing: buildDiscoveryBriefing(input),
					conversationContext: input.conversationContext,
					transformTools: (tools) =>
						wrapNodesToolForTypeDefinitionCapture(tools, capturedTypeDefinitions),
				},
				context,
			);

			return { result: appendTypeDefinitions(result, capturedTypeDefinitions) };
		})
		.build();
}
