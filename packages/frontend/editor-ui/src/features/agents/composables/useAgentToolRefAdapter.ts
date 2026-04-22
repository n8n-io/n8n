import { v4 as uuidv4 } from 'uuid';
import type { INode, INodeCredentials, INodeTypeDescription } from 'n8n-workflow';

import type { IWorkflowDb } from '@/Interface';
import type { AgentJsonToolRef, NodeToolConfig } from '../types';

/**
 * Two-way adapter between the agent's persisted tool shape (`AgentJsonToolRef`
 * with `type: 'node'`) and the richer `INode` shape that the NDV parameter
 * form and Chat Hub's ToolListItem component both operate on.
 *
 * The agent config stores node tools as a flat ref:
 *   { type: 'node', name, description, node: { nodeType, nodeTypeVersion,
 *     nodeParameters, credentials }, inputSchema, requireApproval }
 *
 * Rendering a row in the tools list only needs `INode.type`, `typeVersion`,
 * `name`, and — for the settings/config panel — `parameters` and
 * `credentials`. `inputSchema` stays on the ref and is round-tripped.
 */

function pickLatestVersion(version: number | number[]): number {
	if (Array.isArray(version)) {
		return [...version].sort((a, b) => b - a)[0] ?? 1;
	}
	return version;
}

/**
 * Strip the trailing `Tool` suffix from a Tool-variant name.
 *
 * Kept as a utility for legacy config migration only. We no longer apply it on
 * read or write — the executor now tolerates both base and Tool-variant names
 * (via `isUsableAsAgentTool` + `supplyData` routing), and the config form
 * relies on the Tool-variant description to surface the AI codex that
 * enables the "Let the model define this parameter" override button
 * (`canBeContentOverride` in `fromAIOverride.utils.ts`).
 */
export function toBaseNodeType(name: string): string {
	return name.endsWith('Tool') ? name.slice(0, -'Tool'.length) : name;
}

/**
 * Native tool nodes (e.g. `toolWikipedia`, `toolCalculator`) have no
 * `resource`/`operation` dimensions — they wrap a LangChain `Tool` whose own
 * schema is `z.object({ input: z.string() })`. They're distinct from the
 * wrapped-variant shape (`slackTool`, etc.) which inherits `resource`/
 * `operation` from its base node.
 */
function isNativeToolNode(nodeType: INodeTypeDescription): boolean {
	const props = nodeType.properties ?? [];
	const hasResource = props.some((p) => p.name === 'resource');
	const hasOperation = props.some((p) => p.name === 'operation');
	if (hasResource || hasOperation) return false;
	const outputs = nodeType.outputs;
	if (!Array.isArray(outputs)) return false;
	return outputs.some((o) => {
		if (typeof o === 'string') return o === 'ai_tool';
		return typeof o === 'object' && o !== null && 'type' in o && o.type === 'ai_tool';
	});
}

/**
 * Seed an `inputSchema` that matches LangChain `Tool`'s base schema shape
 * (`{ input: string }`). The LLM gets a clear signal to provide the query
 * text, and at runtime our supplyData handler hands that object to
 * `langchainTool.invoke(...)`, which unwraps `.input` to the string expected
 * by the underlying `_call`. For non-native nodes we stay with an empty schema
 * — their dynamic params are configured explicitly per field.
 */
function defaultInputSchemaForNodeType(nodeType: INodeTypeDescription): Record<string, unknown> {
	if (!isNativeToolNode(nodeType)) {
		return { type: 'object', properties: {} };
	}
	return {
		type: 'object',
		properties: {
			input: {
				type: 'string',
				description:
					nodeType.description ?? `The query or input text to pass to ${nodeType.displayName}.`,
			},
		},
		required: ['input'],
	};
}

/**
 * Convert the config's strict credential map (`{ id: string; name: string }`)
 * to `INodeCredentials` (`id: string | null`) for rendering.
 */
function toINodeCredentials(
	credentials: NodeToolConfig['credentials'],
): INodeCredentials | undefined {
	if (!credentials) return undefined;
	const out: INodeCredentials = {};
	for (const [credType, value] of Object.entries(credentials)) {
		out[credType] = { id: value.id, name: value.name };
	}
	return out;
}

/**
 * Convert `INodeCredentials` (id nullable) back to the config shape
 * (id required). Drops entries whose credential is not yet persisted.
 */
function toConfigCredentials(
	credentials: INodeCredentials | undefined,
): NodeToolConfig['credentials'] {
	if (!credentials) return undefined;
	const out: NonNullable<NodeToolConfig['credentials']> = {};
	for (const [credType, value] of Object.entries(credentials)) {
		if (value.id === null) continue;
		out[credType] = { id: value.id, name: value.name };
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

/** Shape a node-type `AgentJsonToolRef` as an `INode` for list rendering. */
export function toolRefToNode(ref: AgentJsonToolRef): INode | null {
	if (ref.type !== 'node' || !ref.node) return null;

	return {
		id: ref.id ?? uuidv4(),
		name: ref.name ?? ref.node.nodeType,
		type: ref.node.nodeType,
		typeVersion: ref.node.nodeTypeVersion,
		parameters: (ref.node.nodeParameters ?? {}) as INode['parameters'],
		credentials: toINodeCredentials(ref.node.credentials),
		position: [0, 0],
	};
}

/** Build a new `AgentJsonToolRef` for a node type the user just connected. */
export function nodeTypeToNewToolRef(nodeType: INodeTypeDescription): AgentJsonToolRef {
	const version = pickLatestVersion(nodeType.version);
	return {
		type: 'node',
		// Display name may carry the " Tool" suffix the variant adds — strip it
		// so the sidebar + config modal show the service name, not "Slack Tool".
		name: nodeType.displayName.replace(/ Tool$/, ''),
		node: {
			// Keep the Tool-variant name as stored in the node-types store. The
			// backend resolver tolerates both forms, and the form render relies on
			// the variant description's AI codex to enable the $fromAI override.
			nodeType: nodeType.name,
			nodeTypeVersion: version,
			nodeParameters: {},
		},
		// Native tool nodes get a `{ input: string }` default so the LLM has a
		// slot for the query; standard tool-wrapped nodes start empty and get
		// their dynamic params filled in via the config modal.
		inputSchema: defaultInputSchemaForNodeType(nodeType),
	};
}

/** Merge edits made to an `INode` back into the original ref (preserving extra fields). */
export function updateToolRefFromNode(original: AgentJsonToolRef, node: INode): AgentJsonToolRef {
	if (original.type !== 'node' || !original.node) return original;

	return {
		...original,
		name: node.name,
		node: {
			...original.node,
			nodeType: node.type,
			nodeTypeVersion: node.typeVersion,
			nodeParameters: node.parameters as Record<string, unknown>,
			credentials: toConfigCredentials(node.credentials),
		},
	};
}

/**
 * Build a new `AgentJsonToolRef` of type `workflow` from the user's chosen
 * workflow. Persists the workflow's **name** (not id) on `ref.workflow`
 * because the backend's `buildWorkflowTool` looks workflows up by name scoped
 * to the project — see `cli/src/modules/agents/tools/workflow-tool-factory.ts`.
 */
export function workflowToNewToolRef(workflow: IWorkflowDb): AgentJsonToolRef {
	return {
		type: 'workflow',
		workflow: workflow.name,
		name: workflow.name,
		description: workflow.description ?? '',
		allOutputs: false,
	};
}

/**
 * Collect the display names of every tool in the list, optionally excluding
 * the one currently being edited. Feeds the config form's name-uniqueness
 * check from both the sidebar gear path and the tools-modal connect / gear
 * paths so they stay in sync.
 */
export function getExistingToolNames(
	tools: AgentJsonToolRef[],
	exclude?: AgentJsonToolRef,
): string[] {
	return tools.filter((t) => t !== exclude && t.name).map((t) => t.name as string);
}

/** Merge edits from the workflow config form back into the ref. */
export function updateWorkflowToolRef(
	original: AgentJsonToolRef,
	edits: { name: string; description: string; allOutputs: boolean },
): AgentJsonToolRef {
	if (original.type !== 'workflow') return original;
	return {
		...original,
		name: edits.name,
		description: edits.description,
		allOutputs: edits.allOutputs,
	};
}
