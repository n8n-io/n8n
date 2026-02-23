import type { ProgrammaticChecksResult, ProgrammaticViolation } from '@/validation/types';

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

export function formatWorkflowValidation(validation: ProgrammaticChecksResult | null): string {
	if (!validation) {
		return 'Workflow validation not yet run. Call the validate_workflow tool to analyze the current workflow.';
	}

	const lines: string[] = ['Workflow Validation Summary:'];

	const violationLines = formatViolationsByCategory([
		['Connections', validation.connections],
		['Trigger', validation.trigger],
		['Nodes', validation.nodes],
		['Agent Prompt', validation.agentPrompt],
		['Tools', validation.tools],
		['From AI', validation.fromAi],
	]);

	if (violationLines.length === 0) {
		lines.push('No validation violations detected.');
	} else {
		lines.push(...violationLines);
	}

	return lines.join('\n');
}
