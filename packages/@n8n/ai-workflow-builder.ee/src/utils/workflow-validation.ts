import type { ProgrammaticEvaluationResult, ProgrammaticViolation } from '../programmatic/types';

function formatViolationsByCategory(
	categories: Array<[string, ProgrammaticViolation[]]>,
): string[] {
	const lines: string[] = [];

	for (const [name, violations] of categories) {
		if (!violations.length) continue;

		lines.push(`${name}:`);
		for (const violation of violations) {
			lines.push(`- (${violation.type}) ${violation.description}`);
		}
	}

	return lines;
}

export function formatWorkflowValidation(validation: ProgrammaticEvaluationResult | null): string {
	if (!validation) {
		return 'Workflow validation not yet run. Call the validate_workflow tool to analyze the current workflow.';
	}

	const lines: string[] = [
		'Workflow Validation Summary:',
		`Overall score: ${Math.round(validation.overallScore * 100)}%`,
	];

	const violationLines = formatViolationsByCategory([
		['Connections', validation.connections.violations],
		['Trigger', validation.trigger.violations],
		['Agent Prompt', validation.agentPrompt.violations],
		['Tools', validation.tools.violations],
		['From AI', validation.fromAi.violations],
	]);

	if (violationLines.length === 0) {
		lines.push('No validation violations detected.');
	} else {
		lines.push(...violationLines);
	}

	return lines.join('\n');
}
