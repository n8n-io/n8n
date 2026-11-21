import { resolveEffectiveRules, type EffectiveRule } from './merge';
import type { RulesExportBundle } from './schema';

/** The effective rules for one project, read from an exported bundle. */
export function resolveRulesFromBundle(
	bundle: RulesExportBundle,
	projectId?: string,
): EffectiveRule[] {
	const project = projectId
		? bundle.projects.find((entry) => entry.projectId === projectId)?.ruleSet
		: undefined;
	return resolveEffectiveRules(bundle.instance, project);
}

export function exemptedRuleIdsFromBundle(
	bundle: RulesExportBundle,
	workflowId: string | undefined,
): string[] {
	if (!workflowId) return [];
	return bundle.exemptions
		.filter((exemption) => exemption.workflowId === workflowId)
		.map((exemption) => exemption.ruleId);
}
