import { prompt } from '@/prompts/builder';
import type { NodeRecommendation } from '@/types';

/**
 * Converts a NodeRecommendation to formatted XML output using the prompt builder
 */
export function formatRecommendation(rec: NodeRecommendation): string {
	const builder = prompt()
		.section('default_node', rec.defaultNode)
		.section('operations', rec.operations.map((op) => `- ${op}`).join('\n'))
		.section('reasoning', rec.reasoning);

	// Add connected nodes if present
	if (rec.connectedNodes && rec.connectedNodes.length > 0) {
		const connectedContent = rec.connectedNodes
			.map((cn) => {
				const desc = cn.description ? ` - ${cn.description}` : '';
				return `- ${cn.nodeType} (connection: ${cn.connectionType})${desc}`;
			})
			.join('\n');
		builder.section('connected_nodes', connectedContent);
	}

	// Add note if present
	if (rec.note) {
		builder.section('note', rec.note);
	}

	return builder.build();
}
