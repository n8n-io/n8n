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
		// Stable id assigned on creation so the modal's `onConfirm` callback can
		// locate this ref in the current tools array by identity, even if the
		// array has been rebuilt by an intervening reactive update.
		id: uuidv4(),
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

/**
 * Walk `nodeParameters` (recursively, including arrays + objects) and collect
 * every `$fromAI(key, description?, type?)` expression the user has planted via
 * the "Let AI define this parameter" override. Returns the JSON Schema the LLM
 * should receive for the tool — or `null` if no overrides are present.
 *
 * The override is written into the parameter as an n8n expression, e.g.
 * `={{ $fromAI('channel', 'Slack channel id', 'string') }}`. At runtime the
 * LangChain side parses that same form; we parse it at config-save time so
 * `ref.inputSchema` stays in lockstep with `ref.node.nodeParameters` and the
 * model is told the exact arg shape it's expected to supply.
 */
export function extractFromAIInputSchema(
	nodeParameters: Record<string, unknown>,
): Record<string, unknown> | null {
	type Prop = { type: string; description?: string };
	const properties: Record<string, Prop> = {};
	const required: string[] = [];

	// $fromAI('key', 'description', 'type', default?)
	//  - key is required, must be a bare identifier (JSON property name)
	//  - description + type + default are optional
	//  - type is one of string | number | boolean | json; maps to JSON Schema types
	// Allows either single or double quotes, and extra whitespace.
	const FROM_AI_REGEX =
		/\$fromAI\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]*)['"])?(?:\s*,\s*['"]?(string|number|boolean|json)['"]?)?/g;

	function toJsonSchemaType(raw: string | undefined): string {
		switch (raw) {
			case 'number':
				return 'number';
			case 'boolean':
				return 'boolean';
			case 'json':
				return 'object';
			default:
				return 'string';
		}
	}

	function walk(value: unknown): void {
		if (typeof value === 'string' && value.includes('$fromAI')) {
			// `lastIndex` must reset per string to avoid the regex skipping matches
			// after prior invocations.
			FROM_AI_REGEX.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = FROM_AI_REGEX.exec(value)) !== null) {
				const [, key, description, type] = match;
				if (!key || properties[key]) continue;
				properties[key] = {
					type: toJsonSchemaType(type),
					...(description ? { description } : {}),
				};
				required.push(key);
			}
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) walk(item);
			return;
		}
		if (value !== null && typeof value === 'object') {
			for (const v of Object.values(value)) walk(v);
		}
	}

	walk(nodeParameters);

	if (required.length === 0) return null;

	return {
		type: 'object',
		properties,
		required,
	};
}

/**
 * Merge edits made to an `INode` back into the original ref (preserving extra
 * fields). `inputSchema` is always regenerated from the `$fromAI` overrides
 * found in the new parameters — or reset to an empty object when none remain.
 * Leaving a stale `$fromAI`-derived schema in place after the user cleared all
 * overrides would mislead the LLM; resetting lets the backend's
 * `resolveInputSchema` re-introspect at tool-registration time, which
 * regenerates the native-tool seed or the MCP-introspected shape.
 */
export function updateToolRefFromNode(original: AgentJsonToolRef, node: INode): AgentJsonToolRef {
	if (original.type !== 'node' || !original.node) return original;

	const derivedSchema = extractFromAIInputSchema(node.parameters as Record<string, unknown>);

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
		inputSchema: derivedSchema ?? { type: 'object', properties: {} },
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
		// Stable id: see `nodeTypeToNewToolRef` for rationale.
		id: uuidv4(),
		workflow: workflow.name,
		name: workflow.name,
		description: workflow.description ?? '',
		allOutputs: false,
	};
}

/**
 * Replace a tool ref in a list, identifying it by its stable `id` when
 * available and falling back to reference equality for legacy refs created
 * before ids were assigned. Relying purely on reference equality is brittle
 * when the tools array can be rebuilt between open-time and confirm-time of
 * the config modal (e.g. another reactive update landing mid-edit) — every
 * element then has a fresh reference and the map would silently no-op.
 */
export function replaceToolRefInList(
	tools: AgentJsonToolRef[],
	target: AgentJsonToolRef,
	replacement: AgentJsonToolRef,
): AgentJsonToolRef[] {
	if (target.id) {
		return tools.map((t) => (t.id === target.id ? replacement : t));
	}
	return tools.map((t) => (t === target ? replacement : t));
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
	return tools.filter((t) => t !== exclude && Boolean(t.name)).map((t) => t.name as string);
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
