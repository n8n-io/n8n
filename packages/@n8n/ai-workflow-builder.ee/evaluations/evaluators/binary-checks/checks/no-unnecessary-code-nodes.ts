import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const noUnnecessaryCodeNodes: BinaryCheck = {
	name: 'no_unnecessary_code_nodes',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		if (ctx.annotations?.code_necessary === true) {
			return { pass: true, comment: 'Code marked as necessary by annotation' };
		}

		if (!workflow.nodes || workflow.nodes.length === 0) {
			return { pass: true };
		}

		const codeNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.code');
		return {
			pass: codeNodes.length === 0,
			...(codeNodes.length > 0
				? { comment: `Unnecessary code nodes: ${codeNodes.map((n) => n.name).join(', ')}` }
				: {}),
		};
	},
};
