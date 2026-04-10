import type { BinaryCheck } from '../types';

export const hasNodes: BinaryCheck = {
	name: 'has_nodes',
	description: 'Workflow contains at least one node',
	kind: 'deterministic',
	run(workflow) {
		const count = (workflow.nodes ?? []).length;
		return {
			pass: count > 0,
			...(count === 0 ? { comment: 'Workflow has no nodes' } : {}),
		};
	},
};
