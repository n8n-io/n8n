import type { BinaryCheck } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

export const noUnnecessaryCodeNodes: BinaryCheck = {
	name: 'no_unnecessary_code_nodes',
	description: 'No code nodes in the workflow (prefer built-in nodes)',
	kind: 'deterministic',
	async run(workflow) {
		const codeNodes = (workflow.nodes ?? []).filter((n) => n.type === CODE_NODE_TYPE);

		return {
			pass: codeNodes.length === 0,
			...(codeNodes.length > 0
				? { comment: `Code node(s) found: ${codeNodes.map((n) => n.name).join(', ')}` }
				: {}),
		};
	},
};
