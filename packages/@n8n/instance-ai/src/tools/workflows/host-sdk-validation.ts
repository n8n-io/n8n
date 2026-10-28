import { workflow as workflowBuilder, type WorkflowJSON } from '@n8n/workflow-sdk';

import { collectValidationIssues, type ValidationWarning } from './workflow-validation-warnings';

/** Most host-only findings one build reports. The build result is model context. */
export const MAX_HOST_SDK_FINDINGS = 5;

/** One finding per code, node and parameter, so two bad fields on one node both show. */
const findingKey = (warning: ValidationWarning) =>
	`${warning.code}|${warning.nodeName ?? ''}|${warning.parameterPath ?? ''}`;

function runMonorepoValidators(
	json: WorkflowJSON,
	declaredOutputs: NonNullable<WorkflowJSON['pinData']> | undefined,
): ValidationWarning[] {
	const issues: ValidationWarning[] = [];
	try {
		const result = workflowBuilder.fromJSON(json, { declaredOutputs }).validate();
		collectValidationIssues([...result.errors, ...result.warnings], issues);
	} catch {
		// The sandbox already validated this workflow; a failed re-check adds nothing.
	}
	return issues;
}

/**
 * Runs the graph validators of the monorepo SDK on the compiled workflow.
 *
 * The sandbox installs the published SDK, so its `wf.validate()` misses validators
 * that are not released yet. Returns only findings that `reported` does not hold,
 * capped at {@link MAX_HOST_SDK_FINDINGS}. Each finding keeps the severity that
 * its validator set, so a build behaves the same before and after the release.
 */
export function collectHostSdkValidatorWarnings(
	json: WorkflowJSON,
	declaredOutputs: NonNullable<WorkflowJSON['pinData']> | undefined,
	reported: ValidationWarning[],
): ValidationWarning[] {
	const seen = new Set(reported.map(findingKey));
	const findings = runMonorepoValidators(json, declaredOutputs).filter((issue) => {
		const key = findingKey(issue);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	return findings.slice(0, MAX_HOST_SDK_FINDINGS);
}
