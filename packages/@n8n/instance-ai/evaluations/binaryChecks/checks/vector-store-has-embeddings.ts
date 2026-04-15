import type { BinaryCheck } from '../types';
import { collectTargetsByConnectionType } from '../utils';

function isVectorStoreNode(type: string): boolean {
	const shortName = type.split('.').pop() ?? '';
	return shortName.startsWith('vectorStore');
}

export const vectorStoreHasEmbeddings: BinaryCheck = {
	name: 'vector_store_has_embeddings',
	description: 'Vector store nodes have an embeddings model connected',
	kind: 'deterministic',
	run(workflow) {
		const nodes = (workflow.nodes ?? []).filter((n) => isVectorStoreNode(n.type));
		if (nodes.length === 0) return { pass: true };

		const embeddingTargets = collectTargetsByConnectionType(
			workflow.connections ?? {},
			'ai_embedding',
		);
		const missing = nodes.filter((n) => !embeddingTargets.has(n.name)).map((n) => n.name);

		return {
			pass: missing.length === 0,
			...(missing.length > 0
				? { comment: `Vector store node(s) missing embeddings connection: ${missing.join(', ')}` }
				: {}),
		};
	},
};
