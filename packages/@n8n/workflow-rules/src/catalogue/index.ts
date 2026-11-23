import type { CatalogueRule } from './define';
import { nodeNameNotDefault, workflowNamePattern } from './conventions';
import { errorWorkflowRequired, executionTimeout, maxNodes, noDisabledNodes } from './reliability';
import {
	allowedHttpDomains,
	httpRequestCredential,
	noHardcodedSecrets,
	subWorkflowCallerPolicy,
} from './security';

export type { CatalogueRule } from './define';

export const CATALOGUE_RULES: readonly CatalogueRule[] = [
	httpRequestCredential,
	noHardcodedSecrets,
	allowedHttpDomains,
	subWorkflowCallerPolicy,
	errorWorkflowRequired,
	executionTimeout,
	noDisabledNodes,
	maxNodes,
	workflowNamePattern,
	nodeNameNotDefault,
];

export const CATALOGUE_RULE_IDS = CATALOGUE_RULES.map((rule) => rule.id);

const RULES_BY_ID = new Map(CATALOGUE_RULES.map((rule) => [rule.id, rule]));

export function getCatalogueRule(id: string): CatalogueRule | undefined {
	return RULES_BY_ID.get(id);
}
