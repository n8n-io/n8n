import { isTriggerNode } from '../utils';
import type { BinaryCheck } from '../types';

export const hasTrigger: BinaryCheck = {
	name: 'has_trigger',
	description: 'Workflow contains a trigger or start node',
	kind: 'deterministic',
	async run(workflow) {
		const nodes = workflow.nodes ?? [];
		const triggers = nodes.filter((n) => isTriggerNode(n.type));
		return {
			pass: triggers.length > 0,
			...(triggers.length === 0 ? { comment: 'No trigger or start node found' } : {}),
		};
	},
};
