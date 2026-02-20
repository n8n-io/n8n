import { validateConnections } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const memoryProperlyConnected: BinaryCheck = {
	name: 'memory_properly_connected',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateConnections(workflow, ctx.nodeTypes);
		const failed = violations.some(
			(v) => v.name === 'sub-node-not-connected' && v.metadata?.outputType === 'ai_memory',
		);
		return {
			pass: !failed,
			...(failed ? { comment: 'Memory node not properly connected to parent node' } : {}),
		};
	},
};
