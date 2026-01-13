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

	// Add note if present
	if (rec.note) {
		builder.section('note', rec.note);
	}

	return builder.build();
}
