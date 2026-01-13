import type { NodeRecommendation } from '../../../../types/node-recommendations';
import { prompt } from '../../../builder';

/**
 * Converts a NodeRecommendation to formatted XML output using the prompt builder
 */
export function formatRecommendation(rec: NodeRecommendation): string {
	const builder = prompt()
		.section('default_node', rec.defaultNode)
		.section('operations', rec.operations.map((op) => `- ${op}`).join('\n'))
		.section('reasoning', rec.reasoning);

	// Add alternatives if present
	if (rec.alternatives && rec.alternatives.length > 0) {
		const alternativesContent = rec.alternatives
			.map((alt) => `- ${alt.trigger}: ${alt.recommendation}`)
			.join('\n');
		builder.section('alternatives', alternativesContent);
	}

	// Add note if present
	if (rec.note) {
		builder.section('note', rec.note);
	}

	return builder.build();
}
