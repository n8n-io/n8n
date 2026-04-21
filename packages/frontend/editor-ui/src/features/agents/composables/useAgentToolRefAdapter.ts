import { v4 as uuidv4 } from 'uuid';
import type { INode, INodeCredentials, INodeTypeDescription } from 'n8n-workflow';

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
		name: nodeType.displayName,
		node: {
			nodeType: nodeType.name,
			nodeTypeVersion: version,
			nodeParameters: {},
		},
		// Minimal schema — the LLM sees an object with no required inputs.
		// Phase 3 will replace this when the user configures which params are dynamic.
		inputSchema: { type: 'object', properties: {} },
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
 * A node-type tool is missing credentials when the underlying node declares
 * at least one required credential type but the tool ref has no matching
 * saved credential entry.
 */
export function isToolMissingCredentials(
	ref: AgentJsonToolRef,
	nodeType: INodeTypeDescription | null,
): boolean {
	if (ref.type !== 'node' || !ref.node || !nodeType) return false;
	const required = (nodeType.credentials ?? []).filter((c) => c.required !== false);
	if (required.length === 0) return false;
	const saved = ref.node.credentials ?? {};
	return required.some((c) => !saved[c.name] || !saved[c.name].id);
}
