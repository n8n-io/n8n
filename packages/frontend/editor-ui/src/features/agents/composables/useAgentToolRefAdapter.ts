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
 *     nodeParameters, credentials }, requireApproval }
 *
 * Rendering a row in the tools list only needs `INode.type`, `typeVersion`,
 * `name`, and — for the settings/config panel — `parameters` and
 * `credentials`.
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
		id: uuidv4(),
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
	};
}

/**
 * Merge edits made to an `INode` back into the original ref (preserving extra
 * fields).
 */
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
