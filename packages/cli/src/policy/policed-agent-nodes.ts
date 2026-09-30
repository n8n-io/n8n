import { isRecord } from '@n8n/utils/is-record';
import type { INode, INodeCredentials } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { resolveToolNodeType } from '@/node-execution/resolve-tool-node-type';

// An AI Agent node attaches Message an Agent as its `…Tool` variant.
const MESSAGE_AN_AGENT_NODE_TYPES = new Set([
	'n8n-nodes-base.messageAnAgent',
	'n8n-nodes-base.messageAnAgentTool',
]);

function toPolicedCredentials(credentials: unknown): INodeCredentials | undefined {
	if (!isRecord(credentials)) return undefined;

	// Checks read only the slot keys, which are credential type names.
	const policed: INodeCredentials = {};
	for (const [slot, ref] of Object.entries(credentials)) {
		const id = isRecord(ref) && typeof ref.id === 'string' ? ref.id : null;
		const name = isRecord(ref) && typeof ref.name === 'string' ? ref.name : '';
		policed[slot] = { id, name };
	}

	return policed;
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

	return tools.flatMap((tool: unknown, index): INode[] => {
		if (!isRecord(tool) || tool.type !== 'node' || !isRecord(tool.node)) return [];

		const { nodeType, nodeTypeVersion, nodeParameters, credentials } = tool.node;
		if (typeof nodeType !== 'string') return [];

		const version = typeof nodeTypeVersion === 'number' ? nodeTypeVersion : 1;
		const id = `${idPrefix}${index}`;
		const policed: INode = {
			id,
			name: typeof tool.name === 'string' ? tool.name : `Tool ${index + 1}`,
			// Police the type the tool runs as, so a rule on only the `…Tool` variant still matches.
			type: resolveToolNodeType(nodeType, version),
			typeVersion: version,
			position: [0, 0],
			parameters: {},
			credentials: toPolicedCredentials(credentials),
		};
		const nested = toPolicedNodesWithPrefix(inlineAgentTools(nodeType, nodeParameters), `${id}-`);

		return [policed, ...nested];
	});
}

/**
 * One node for each node tool, in the shape the workflow points police, plus the tools of any
 * inline agent a tool embeds. Untyped on purpose: callers pass parsed configs or raw parameters.
 */
export function toPolicedNodes(tools: unknown): INode[] {
	return toPolicedNodesWithPrefix(tools, 'agent-tool-');
}

/**
 * The workflow's nodes plus the node tools of any inline agent it embeds, so a check sees
 * every node type the workflow can run. Returns the input unchanged when nothing is embedded.
 */
export function withInlineAgentToolNodes(nodes: readonly INode[]): readonly INode[] {
	const embedded = nodes.flatMap((node) =>
		toPolicedNodesWithPrefix(inlineAgentTools(node.type, node.parameters), `${node.id}-tool-`),
	);

	return embedded.length === 0 ? nodes : [...nodes, ...embedded];
}
