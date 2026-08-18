import type { AgentConfigValidationIssue } from '@n8n/api-types';
import type { BaseTextKey, I18nClass } from '@n8n/i18n';

// `as BaseTextKey`: these keys are new (see en.json) and not yet reflected in
// @n8n/i18n's built type declarations — matches the same workaround already
// used for `agents.builder.preview.disabledTooltip` in AgentBuilderHeader.vue.
const GENERIC_ISSUE_KEYS: Record<AgentConfigValidationIssue['code'], BaseTextKey> = {
	missing_required: 'agents.builder.validation.issue.missingRequired' as BaseTextKey,
	invalid_value: 'agents.builder.validation.issue.invalidValue' as BaseTextKey,
	missing_credential: 'agents.builder.validation.issue.missingCredential' as BaseTextKey,
	invalid_credential: 'agents.builder.validation.issue.invalidCredential' as BaseTextKey,
	incompatible_credential: 'agents.builder.validation.issue.incompatibleCredential' as BaseTextKey,
	missing_reference: 'agents.builder.validation.issue.missingReference' as BaseTextKey,
	incompatible_reference: 'agents.builder.validation.issue.incompatibleReference' as BaseTextKey,
};

/**
 * Kind-specific overrides, keyed `<kind>.<code>`, `<kind>.<path>.<code>` or
 * `tool.<toolType>.<code>`. The path-keyed variants name the agent's own
 * fields, which have no capability id to fall back on.
 */
const SPECIFIC_ISSUE_KEYS: Record<string, BaseTextKey> = {
	'agent.instructions.missing_required':
		'agents.builder.validation.issue.agent.instructionsMissing' as BaseTextKey,
	'agent.model.missing_required':
		'agents.builder.validation.issue.agent.modelMissing' as BaseTextKey,
	'agent.model.invalid_value': 'agents.builder.validation.issue.agent.modelInvalid' as BaseTextKey,
	'agent.credential.missing_credential':
		'agents.builder.validation.issue.agent.credentialMissing' as BaseTextKey,
	'agent.credential.invalid_credential':
		'agents.builder.validation.issue.agent.credentialInvalid' as BaseTextKey,
	'agent.credential.incompatible_credential':
		'agents.builder.validation.issue.agent.credentialIncompatible' as BaseTextKey,
	'subAgent.missing_reference':
		'agents.builder.validation.issue.subAgent.missingReference' as BaseTextKey,
	'subAgent.incompatible_reference':
		'agents.builder.validation.issue.subAgent.incompatibleReference' as BaseTextKey,
	'skill.missing_reference':
		'agents.builder.validation.issue.skill.missingReference' as BaseTextKey,
	'task.invalid_value': 'agents.builder.validation.issue.task.invalidValue' as BaseTextKey,
	'tool.workflow.missing_reference':
		'agents.builder.validation.issue.tool.workflow.missingReference' as BaseTextKey,
	'tool.workflow.incompatible_reference':
		'agents.builder.validation.issue.tool.workflow.incompatibleReference' as BaseTextKey,
	'tool.custom.missing_reference':
		'agents.builder.validation.issue.tool.custom.missingReference' as BaseTextKey,
	'tool.node.missing_reference':
		'agents.builder.validation.issue.tool.node.missingReference' as BaseTextKey,
	'mcpServer.incompatible_credential':
		'agents.builder.validation.issue.mcpServer.incompatibleCredential' as BaseTextKey,
};

/** Element labels for the toast — the agent's own fields name themselves. */
const CAPABILITY_LABEL_KEYS: Partial<
	Record<AgentConfigValidationIssue['capability']['kind'], BaseTextKey>
> = {
	channel: 'agents.builder.validation.capability.channel' as BaseTextKey,
	tool: 'agents.builder.validation.capability.tool' as BaseTextKey,
	skill: 'agents.builder.validation.capability.skill' as BaseTextKey,
	task: 'agents.builder.validation.capability.task' as BaseTextKey,
	subAgent: 'agents.builder.validation.capability.subAgent' as BaseTextKey,
	mcpServer: 'agents.builder.validation.capability.mcpServer' as BaseTextKey,
	vectorStore: 'agents.builder.validation.capability.vectorStore' as BaseTextKey,
};

export function agentValidationIssueMessage(
	issue: AgentConfigValidationIssue,
	i18n: Pick<I18nClass, 'baseText'>,
): string {
	const { kind, toolType, id } = issue.capability;
	const key =
		(kind === 'tool' && toolType
			? SPECIFIC_ISSUE_KEYS[`tool.${toolType}.${issue.code}`]
			: undefined) ??
		SPECIFIC_ISSUE_KEYS[`${kind}.${issue.path}.${issue.code}`] ??
		SPECIFIC_ISSUE_KEYS[`${kind}.${issue.code}`] ??
		GENERIC_ISSUE_KEYS[issue.code];
	return i18n.baseText(key, { interpolate: { id: id ?? '' } });
}

/**
 * `<element>: <problem>` — the form used where issues are listed away from the
 * element they belong to (the publish-readiness toast), so each line still says
 * what is broken and where.
 */
export function agentValidationIssueLine(
	issue: AgentConfigValidationIssue,
	i18n: Pick<I18nClass, 'baseText'>,
): string {
	const message = agentValidationIssueMessage(issue, i18n);
	const { kind, id, index } = issue.capability;
	const labelKey = CAPABILITY_LABEL_KEYS[kind];
	if (!labelKey) return message;

	const label = i18n.baseText(labelKey);
	const name = id ?? (index === undefined ? undefined : `#${index + 1}`);
	return `${name ? `${label} ${name}` : label}: ${message}`;
}
