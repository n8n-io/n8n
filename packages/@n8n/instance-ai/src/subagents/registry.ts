import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import { executionDebugger } from './definitions/execution-debugger';
import { generalPurpose } from './definitions/general-purpose';
import { instanceExplorer } from './definitions/instance-explorer';
import { workflowContextScout } from './definitions/workflow-context-scout';
import { instanceAiSubAgentDefinitionSchema, type InstanceAiSubAgentDefinition } from './types';
import { createToolRegistry, toolRegistryKeys } from '../tool-registry';
import { ASK_USER_TOOL_ID } from '../tools/tool-ids';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../types';

/** `subAgentId: "inline"` on the delegate tool resolves to this definition. */
export const GENERAL_PURPOSE_SUB_AGENT_ID = generalPurpose.id;

/**
 * IDs reachable only through another route (inline mapping, the typed
 * `discover-workflow-context` tool) — never surfaced in the SDK's
 * `availableSubAgents` listing to avoid giving the model two routes to the
 * same specialist.
 */
const HIDDEN_FROM_LISTING = new Set<string>([generalPurpose.id, workflowContextScout.id]);

const BUILT_IN_DEFINITIONS: InstanceAiSubAgentDefinition[] = [
	generalPurpose,
	workflowContextScout,
	instanceExplorer,
	executionDebugger,
];

function validateDefinition(
	definition: InstanceAiSubAgentDefinition,
): InstanceAiSubAgentDefinition {
	return instanceAiSubAgentDefinitionSchema.parse(definition);
}

const REGISTRY: ReadonlyMap<string, InstanceAiSubAgentDefinition> = new Map(
	BUILT_IN_DEFINITIONS.map((definition) => [definition.id, validateDefinition(definition)]),
);

/** Look up a built-in sub-agent definition by its `subAgentId`. */
export function getSubAgentDefinition(id: string): InstanceAiSubAgentDefinition | undefined {
	return REGISTRY.get(id);
}

/** The definition `subAgentId: "inline"` maps to. Throws if the registry is misconfigured. */
export function getGeneralPurposeSubAgentDefinition(): InstanceAiSubAgentDefinition {
	const definition = REGISTRY.get(GENERAL_PURPOSE_SUB_AGENT_ID);
	if (!definition) {
		throw new Error(
			`"${GENERAL_PURPOSE_SUB_AGENT_ID}" sub-agent definition is not registered — this is a bug`,
		);
	}
	return definition;
}

/** All registered sub-agent ids, for building "unknown id" error messages. */
export function listSubAgentIds(): string[] {
	return Array.from(REGISTRY.keys());
}

/**
 * Whether `id` may be selected directly as a delegate tool `subAgentId`.
 * Hidden definitions (e.g. `workflow-context-scout`, reachable only through
 * `discover-workflow-context`) are registered but not directly selectable —
 * this keeps a single, schema-validated route to them instead of a second,
 * looser one through the generic delegate surface.
 */
export function isSelectableSubAgentId(id: string): boolean {
	return REGISTRY.has(id) && !HIDDEN_FROM_LISTING.has(id);
}

/** Specialists to list on the SDK delegate tool's `availableSubAgents` option. */
export function listAvailableSubAgents(): Array<{ id: string; name: string; useWhen: string }> {
	return Array.from(REGISTRY.values())
		.filter((definition) => !HIDDEN_FROM_LISTING.has(definition.id))
		.map(({ id, name, useWhen }) => ({ id, name, useWhen }));
}

/** Fixed note appended to a definition's instructions when `hitl: 'blocked'`. */
const NO_HITL_INSTRUCTION =
	'\n\n## No User Interaction\nYou cannot ask the user for input or clarification. ' +
	'If information is missing or ambiguous, state your assumption explicitly and proceed — never stall waiting for input that will not come.';

/** Build the effective instructions for a definition, including the no-HITL note when blocked. */
export function buildSubAgentInstructions(definition: InstanceAiSubAgentDefinition): string {
	return definition.hitl === 'blocked'
		? `${definition.instructions}${NO_HITL_INSTRUCTION}`
		: definition.instructions;
}

/** Wrap a multi-action domain tool so only the allowlisted actions execute. */
function wrapToolWithActionScope(tool: BuiltTool, actions: string[]): BuiltTool {
	const allowed = new Set(actions);
	return {
		...tool,
		handler: async (input, ctx) => {
			const action = isRecord(input) ? input.action : undefined;
			if (typeof action === 'string' && !allowed.has(action)) {
				return {
					error: `Action "${action}" is not permitted for this sub-agent. Allowed actions for "${tool.name}": ${actions.join(', ')}.`,
				};
			}
			return await tool.handler?.(input, ctx);
		},
	};
}

export interface ResolvedSubAgentTools {
	tools: InstanceAiToolRegistry;
	toolNames: string[];
}

/**
 * Resolve a definition's declared tool scopes against the orchestration
 * context's domain tools: applies action-level scoping, and strips
 * `ask-user` when `hitl: 'blocked'` regardless of what the definition lists
 * (defense in depth — no v1 built-in lists it, but this makes the guarantee
 * structural rather than a convention every definition author must remember).
 */
export function resolveSubAgentTools(
	definition: InstanceAiSubAgentDefinition,
	context: OrchestrationContext,
): ResolvedSubAgentTools {
	const tools = createToolRegistry();

	for (const scope of definition.tools) {
		const toolId = typeof scope === 'string' ? scope : scope.id;
		if (definition.hitl === 'blocked' && toolId === ASK_USER_TOOL_ID) continue;

		const tool = context.domainTools.get(toolId);
		if (!tool) continue;

		tools.set(
			toolId,
			typeof scope === 'string' ? tool : wrapToolWithActionScope(tool, scope.actions),
		);
	}

	return { tools, toolNames: toolRegistryKeys(tools) };
}
