import type { BaseTextKey } from '@n8n/i18n';
import type { RuleCategory, RuleSeverity } from '@n8n/workflow-rules';

// Must match the backend module id: both gate off `/rest/module-settings`.
export const WORKFLOW_RULES_MODULE_ID = 'workflow-rules';

export const WORKFLOW_RULES_SETTINGS_VIEW = 'WorkflowRulesSettingsView';
export const PROJECT_WORKFLOW_RULES_VIEW = 'ProjectWorkflowRulesView';

export const WORKFLOW_RULES_MANAGE_SCOPE = 'workflowRules:manage';

/** The `kind` of a policy violation that a blocking Workflow Rule finding produces on the server. */
export const WORKFLOW_RULE_VIOLATION_KIND = 'workflow-rule';

export const WORKFLOW_RULES_DOCS_URL = 'https://docs.n8n.io/workflows/workflow-rules/';

/** Text keys for each catalogue rule. Keyed by rule id, so a new rule fails typecheck until it has copy. */
export const CATALOGUE_RULE_TEXT: Record<string, { title: BaseTextKey; description: BaseTextKey }> =
	{
		'http-request-credential': {
			title: 'workflowRules.rule.httpRequestCredential.title',
			description: 'workflowRules.rule.httpRequestCredential.description',
		},
		'no-hardcoded-secrets': {
			title: 'workflowRules.rule.noHardcodedSecrets.title',
			description: 'workflowRules.rule.noHardcodedSecrets.description',
		},
		'allowed-http-domains': {
			title: 'workflowRules.rule.allowedHttpDomains.title',
			description: 'workflowRules.rule.allowedHttpDomains.description',
		},
		'sub-workflow-caller-policy': {
			title: 'workflowRules.rule.subWorkflowCallerPolicy.title',
			description: 'workflowRules.rule.subWorkflowCallerPolicy.description',
		},
		'error-workflow-required': {
			title: 'workflowRules.rule.errorWorkflowRequired.title',
			description: 'workflowRules.rule.errorWorkflowRequired.description',
		},
		'execution-timeout': {
			title: 'workflowRules.rule.executionTimeout.title',
			description: 'workflowRules.rule.executionTimeout.description',
		},
		'no-disabled-nodes': {
			title: 'workflowRules.rule.noDisabledNodes.title',
			description: 'workflowRules.rule.noDisabledNodes.description',
		},
		'max-nodes': {
			title: 'workflowRules.rule.maxNodes.title',
			description: 'workflowRules.rule.maxNodes.description',
		},
		'workflow-name-pattern': {
			title: 'workflowRules.rule.workflowNamePattern.title',
			description: 'workflowRules.rule.workflowNamePattern.description',
		},
		'node-name-not-default': {
			title: 'workflowRules.rule.nodeNameNotDefault.title',
			description: 'workflowRules.rule.nodeNameNotDefault.description',
		},
	};

export const CATEGORY_TEXT: Record<RuleCategory, BaseTextKey> = {
	security: 'workflowRules.category.security',
	reliability: 'workflowRules.category.reliability',
	conventions: 'workflowRules.category.conventions',
};

export const SEVERITY_TEXT: Record<RuleSeverity, BaseTextKey> = {
	off: 'workflowRules.severity.off',
	warn: 'workflowRules.severity.warn',
	block: 'workflowRules.severity.block',
};

/** Catalogue rules that open the workflow settings to fix. The rest open the node. */
export const SETTINGS_RULE_IDS: ReadonlySet<string> = new Set([
	'error-workflow-required',
	'execution-timeout',
	'sub-workflow-caller-policy',
	'workflow-name-pattern',
]);
