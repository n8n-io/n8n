import { isRecord } from '@n8n/utils/is-record';
import type { INode, INodeCredentials } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

const MESSAGE_AN_AGENT_NODE_TYPE = 'n8n-nodes-base.messageAnAgent';

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

/**
 * One node for each node tool, in the shape the workflow points police. Untyped on purpose:
 * saved agents pass a parsed config, inline agents a raw workflow parameter.
 */
export function toPolicedNodes(tools: unknown): INode[] {
	if (!Array.isArray(tools)) return [];

	return tools.flatMap((tool: unknown, index): INode[] => {
		if (!isRecord(tool) || tool.type !== 'node' || !isRecord(tool.node)) return [];

		const { nodeType, nodeTypeVersion, credentials } = tool.node;
		if (typeof nodeType !== 'string') return [];

		return [
			{
				id: `agent-tool-${index}`,
				name: typeof tool.name === 'string' ? tool.name : `Tool ${index + 1}`,
				type: nodeType,
				typeVersion: typeof nodeTypeVersion === 'number' ? nodeTypeVersion : 1,
				position: [0, 0],
				parameters: {},
				credentials: toPolicedCredentials(credentials),
			},
		];
	});
}

function inlineAgentTools(node: INode): unknown {
	// Imported content is not schema-checked, so `parameters` can be missing.
	const parameters: unknown = node.parameters;
	if (node.type !== MESSAGE_AN_AGENT_NODE_TYPE || !isRecord(parameters)) return undefined;
	if (parameters.agentSource !== 'inline') return undefined;

	// An expression has no tools to read until it runs; the tool executor polices it then.
	const raw = parameters.inlineAgent;
	const payload: unknown =
		typeof raw === 'string' && !raw.startsWith('=')
			? jsonParse<unknown>(raw, { fallbackValue: null })
			: raw;

	return isRecord(payload) && isRecord(payload.config) ? payload.config.tools : undefined;
}

/**
 * The workflow's nodes plus the node tools of any inline agent it embeds, so a check sees
 * every node type the workflow can run. Returns the input unchanged when nothing is embedded.
 */
export function withInlineAgentToolNodes(nodes: readonly INode[]): readonly INode[] {
	const embedded = nodes.flatMap((node) => toPolicedNodes(inlineAgentTools(node)));

	return embedded.length === 0 ? nodes : [...nodes, ...embedded];
}
