import type { PlanOutput } from '@/types/planning';

/**
 * Format a PlanOutput as human-readable text.
 * Used by both the discovery subgraph (for planner context) and the builder subgraph (for build instructions).
 */
export function formatPlanAsText(plan: PlanOutput): string {
	const lines: string[] = [];

	lines.push(`Summary: ${plan.summary}`);
	lines.push(`Trigger: ${plan.trigger}`);
	lines.push('');
	lines.push('Steps:');
	plan.steps.forEach((step, index) => {
		lines.push(`${index + 1}. ${step.description}`);
		if (step.subSteps?.length) {
			step.subSteps.forEach((subStep) => lines.push(`   - ${subStep}`));
		}
		if (step.suggestedNodes?.length) {
			lines.push(`   Suggested nodes: ${step.suggestedNodes.join(', ')}`);
		}
	});

	if (plan.additionalSpecs?.length) {
		lines.push('');
		lines.push('Additional specs / assumptions:');
		plan.additionalSpecs.forEach((spec) => lines.push(`- ${spec}`));
	}

	return lines.join('\n');
}
