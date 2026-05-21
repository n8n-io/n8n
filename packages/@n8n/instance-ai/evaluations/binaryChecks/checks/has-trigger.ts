import type { BinaryCheck } from '../types';
import { isTriggerNode } from '../utils';

export const hasTrigger: BinaryCheck = {
	name: 'has_trigger',
	description: 'Workflow contains a trigger or start node',
	kind: 'deterministic',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		const triggers = nodes.filter((n) => isTriggerNode(n.type));
		return {
			pass: triggers.length > 0,
			...(triggers.length === 0 ? { comment: 'No trigger or start node found' } : {}),
		};
	},
};
