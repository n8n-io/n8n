import type { BinaryCheck } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

export const noUnnecessaryCodeNodes: BinaryCheck = {
	name: 'no_unnecessary_code_nodes',
	description: 'No code nodes in the workflow (prefer built-in nodes)',
	kind: 'deterministic',
	run(workflow, ctx) {
		const codeNodes = (workflow.nodes ?? []).filter((n) => n.type === CODE_NODE_TYPE);
		if (codeNodes.length === 0) return { pass: true, applicable: false };

		if (ctx.annotations?.code_necessary === true) {
			return { pass: true, comment: 'Code marked as necessary by annotation' };
		}

		return {
			pass: false,
			comment: `Code node(s) found: ${codeNodes.map((n) => n.name).join(', ')}`,
		};
	},
};
