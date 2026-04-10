import type { BinaryCheck } from '../types';
import { collectSourcesByConnectionType } from '../utils';

function isMemoryNode(type: string): boolean {
	const shortName = type.split('.').pop() ?? '';
	return shortName.toLowerCase().includes('memory');
}

export const memoryProperlyConnected: BinaryCheck = {
	name: 'memory_properly_connected',
	description: 'Memory nodes are properly connected to a parent node',
	kind: 'deterministic',
	run(workflow) {
		const nodes = (workflow.nodes ?? []).filter((n) => isMemoryNode(n.type));
		if (nodes.length === 0) return { pass: true };

		const connectedMemory = collectSourcesByConnectionType(workflow.connections ?? {}, 'ai_memory');
		const disconnected = nodes.filter((n) => !connectedMemory.has(n.name)).map((n) => n.name);

		return {
			pass: disconnected.length === 0,
			...(disconnected.length > 0
				? { comment: `Memory node(s) not connected to parent: ${disconnected.join(', ')}` }
				: {}),
		};
	},
};
