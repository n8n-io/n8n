import type { BinaryCheck } from '../types';

/** Tool nodes that legitimately work without user-configured parameters. */
const TOOLS_WITHOUT_PARAMETERS = new Set([
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolVectorStore',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
	'@n8n/n8n-nodes-langchain.mcpClientTool',
	'@n8n/n8n-nodes-langchain.toolWikipedia',
	'@n8n/n8n-nodes-langchain.toolSerpApi',
]);

function isToolNode(type: string): boolean {
	const shortName = type.split('.').pop() ?? '';
	return shortName.endsWith('Tool') || shortName === 'tool' || /^tool[A-Z]/.test(shortName);
}

export const toolsHaveParameters: BinaryCheck = {
	name: 'tools_have_parameters',
	description: 'Tool nodes have required parameters configured',
	kind: 'deterministic',
	dimension: 'ai_nodes',
	run(workflow) {
		const toolNodes = (workflow.nodes ?? []).filter(
			(n) => isToolNode(n.type) && !TOOLS_WITHOUT_PARAMETERS.has(n.type),
		);
		if (toolNodes.length === 0) return { pass: true, applicable: false };

		const issues = toolNodes
			.filter((n) => !n.parameters || Object.keys(n.parameters).length === 0)
			.map((n) => `"${n.name}" (${n.type}) has no parameters configured`);

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
