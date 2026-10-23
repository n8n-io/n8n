import { NodeToolJsonConfigSchema } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { INode, INodeCredentials } from 'n8n-workflow';
import { isNodeParameters, jsonParse } from 'n8n-workflow';

import { resolveToolNodeType } from '@/node-execution/resolve-tool-node-type';

// An AI Agent node attaches Message an Agent as its `…Tool` variant.
const MESSAGE_AN_AGENT_NODE_TYPES = new Set([
	'n8n-nodes-base.messageAnAgent',
	'n8n-nodes-base.messageAnAgentTool',
]);

// Not strict: an inline agent is raw parameter JSON, and extra keys must not hide its tools.
const PolicedNodeToolSchema = NodeToolJsonConfigSchema.strip();

type PolicedNodeTool = {
	name: string;
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: unknown;
	credentials: INodeCredentials | undefined;
};

// Checks read only the slot keys, which are credential type names.
function toPolicedCredentials(credentials: unknown): INodeCredentials | undefined {
	if (!isRecord(credentials)) return undefined;

	const policed: INodeCredentials = {};
	for (const [slot, ref] of Object.entries(credentials)) {
		const id = isRecord(ref) && typeof ref.id === 'string' ? ref.id : null;
		const name = isRecord(ref) && typeof ref.name === 'string' ? ref.name : '';
		policed[slot] = { id, name };
	}

	return policed;
}

/** Typed through the config schema, so a renamed field breaks the build, not the policy. */
function readNodeTool(tool: unknown, index: number): PolicedNodeTool | null {
	if (!isRecord(tool) || tool.type !== 'node') return null;

	const parsed = PolicedNodeToolSchema.safeParse(tool);
	if (parsed.success) {
		const { name, node } = parsed.data;
		return {
			name,
			nodeType: node.nodeType,
			nodeTypeVersion: node.nodeTypeVersion,
			nodeParameters: node.nodeParameters,
			credentials: toPolicedCredentials(node.credentials),
		};
	}

	// A tool that fails the schema is still policed by everything it names.
	const { node } = tool;
	if (!isRecord(node) || typeof node.nodeType !== 'string') return null;
	return {
		name: `Tool ${index + 1}`,
		nodeType: node.nodeType,
		nodeTypeVersion: typeof node.nodeTypeVersion === 'number' ? node.nodeTypeVersion : 1,
		nodeParameters: node.nodeParameters,
		credentials: toPolicedCredentials(node.credentials),
	};
}

function inlineAgentTools(nodeType: string, parameters: unknown): unknown {
	// Imported content is not schema-checked, so `parameters` can be missing.
	if (!MESSAGE_AN_AGENT_NODE_TYPES.has(nodeType) || !isRecord(parameters)) return undefined;
	if (parameters.agentSource !== 'inline') return undefined;

	// An expression has no tools to read until it runs; the tool executor polices it then.
	const raw = parameters.inlineAgent;
	const payload: unknown =
		typeof raw === 'string' && !raw.startsWith('=')
			? jsonParse<unknown>(raw, { fallbackValue: null })
			: raw;

	return isRecord(payload) && isRecord(payload.config) ? payload.config.tools : undefined;
}

function toPolicedNodesWithPrefix(tools: unknown, idPrefix: string): INode[] {
	if (!Array.isArray(tools)) return [];

	return tools.flatMap((raw: unknown, index): INode[] => {
		const tool = readNodeTool(raw, index);
		if (!tool) return [];

		return [
			{
				id: `${idPrefix}${index}`,
				name: tool.name,
				// Police the type the tool runs as, so a rule on only the `…Tool` variant still matches.
				type: resolveToolNodeType(tool.nodeType, tool.nodeTypeVersion),
				typeVersion: tool.nodeTypeVersion,
				position: [0, 0],
				// Kept so checks that read parameters, such as a named credential type, see them.
				parameters: isNodeParameters(tool.nodeParameters) ? tool.nodeParameters : {},
				credentials: tool.credentials,
			},
		];
	});
}

/**
 * One node for each node tool, in the shape the workflow points police. Untyped input on
 * purpose: callers pass parsed configs or raw parameters. `withInlineAgentToolNodes` adds the
 * tools of an inline agent that a tool embeds.
 */
export function toPolicedNodes(tools: unknown): INode[] {
	return toPolicedNodesWithPrefix(tools, 'agent-tool-');
}

/**
 * The nodes plus the node tools of every inline agent they embed, at any depth, so a check sees
 * every node type that can run. Returns the input unchanged when nothing is embedded.
 */
export function withInlineAgentToolNodes(nodes: readonly INode[]): readonly INode[] {
	const embedded = nodes.flatMap((node) => {
		const tools = toPolicedNodesWithPrefix(
			inlineAgentTools(node.type, node.parameters),
			`${node.id}-tool-`,
		);
		return tools.length === 0 ? [] : withInlineAgentToolNodes(tools);
	});

	return embedded.length === 0 ? nodes : [...nodes, ...embedded];
}
