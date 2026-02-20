import { validateNodes } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const hasNodes: BinaryCheck = {
	name: 'has_nodes',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateNodes(workflow, ctx.nodeTypes);
		const failed = violations.some((v) => v.name === 'workflow-has-no-nodes');
		return { pass: !failed, ...(failed ? { comment: 'Workflow has no nodes' } : {}) };
	},
};
