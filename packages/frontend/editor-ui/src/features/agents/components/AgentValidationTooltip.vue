<script setup lang="ts">
import type { AgentCapabilityKind, AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		disabled: boolean;
		fallback: string;
		action: 'publish' | 'preview';
		issues?: AgentConfigValidationIssue[];
	}>(),
	{ issues: () => [] },
);

const i18n = useI18n();

const GENERIC_ISSUE_KEYS: Record<AgentConfigValidationIssue['code'], BaseTextKey> = {
	missing_required: 'agents.builder.validation.issue.missingRequired' as BaseTextKey,
	invalid_value: 'agents.builder.validation.issue.invalidValue' as BaseTextKey,
	missing_credential: 'agents.builder.validation.issue.missingCredential' as BaseTextKey,
	invalid_credential: 'agents.builder.validation.issue.invalidCredential' as BaseTextKey,
	incompatible_credential: 'agents.builder.validation.issue.incompatibleCredential' as BaseTextKey,
	missing_reference: 'agents.builder.validation.issue.missingReference' as BaseTextKey,
	incompatible_reference: 'agents.builder.validation.issue.incompatibleReference' as BaseTextKey,
};

const SPECIFIC_ISSUE_KEYS: Record<string, BaseTextKey> = {
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

const REASON_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	incompatible_nodes:
		'agents.builder.validation.issue.tool.workflow.incompatibleNodes' as BaseTextKey,
	no_supported_trigger:
		'agents.builder.validation.issue.tool.workflow.noSupportedTrigger' as BaseTextKey,
};

const CORE_ISSUE_KEYS: Record<string, BaseTextKey> = {
	'instructions.missing_required':
		'agents.builder.validation.tooltip.instructionsRequired' as BaseTextKey,
	'model.missing_required': 'agents.builder.validation.tooltip.modelRequired' as BaseTextKey,
	'model.invalid_value': 'agents.builder.validation.tooltip.modelInvalid' as BaseTextKey,
	'credential.missing_credential':
		'agents.builder.validation.tooltip.credentialRequired' as BaseTextKey,
	'credential.invalid_credential':
		'agents.builder.validation.tooltip.credentialInvalid' as BaseTextKey,
	'credential.incompatible_credential':
		'agents.builder.validation.tooltip.credentialIncompatible' as BaseTextKey,
};

const CAPABILITY_KEYS: Record<AgentCapabilityKind, BaseTextKey> = {
	agent: 'agents.builder.validation.capability.agent' as BaseTextKey,
	channel: 'agents.builder.validation.capability.channel' as BaseTextKey,
	tool: 'agents.builder.validation.capability.tool' as BaseTextKey,
	mcpServer: 'agents.builder.validation.capability.mcpServer' as BaseTextKey,
	skill: 'agents.builder.validation.capability.skill' as BaseTextKey,
	task: 'agents.builder.validation.capability.task' as BaseTextKey,
	subAgent: 'agents.builder.validation.capability.subAgent' as BaseTextKey,
	vectorStore: 'agents.builder.validation.capability.vectorStore' as BaseTextKey,
};

const NAMED_CAPABILITIES = new Set<AgentCapabilityKind>([
	'channel',
	'tool',
	'mcpServer',
	'vectorStore',
]);

const heading = computed(() =>
	i18n.baseText(
		(props.action === 'publish'
			? 'agents.builder.validation.tooltip.publish'
			: 'agents.builder.validation.tooltip.preview') as BaseTextKey,
	),
);

function isPreviewIssue(issue: AgentConfigValidationIssue): boolean {
	if (issue.capability.kind === 'channel' || issue.capability.kind === 'task') return false;

	// Fixed URLs are required for publishing, but the draft preview can still run.
	return !(issue.code === 'invalid_value' && issue.path.endsWith('.node.nodeParameters.url'));
}

function capabilityLabel(issue: AgentConfigValidationIssue): string {
	const type = i18n.baseText(CAPABILITY_KEYS[issue.capability.kind]);
	const name = issue.capability.id?.trim();
	if (name && NAMED_CAPABILITIES.has(issue.capability.kind)) {
		return i18n.baseText('agents.builder.validation.capability.named' as BaseTextKey, {
			interpolate: { type, name },
		});
	}

	if (issue.capability.index !== undefined && issue.capability.kind === 'tool') {
		return i18n.baseText('agents.builder.validation.capability.numbered' as BaseTextKey, {
			interpolate: { type, number: issue.capability.index + 1 },
		});
	}

	return type;
}

function issueMessage(issue: AgentConfigValidationIssue): string {
	if (issue.capability.kind === 'agent') {
		const coreKey = CORE_ISSUE_KEYS[`${issue.path}.${issue.code}`];
		if (coreKey) return i18n.baseText(coreKey);
	}

	const { kind, toolType, id } = issue.capability;
	const key =
		(issue.code === 'invalid_value' && issue.path.endsWith('.node.nodeParameters.url')
			? ('agents.builder.validation.issue.httpRequestUrlFromAi' as BaseTextKey)
			: undefined) ??
		(issue.reason ? REASON_SPECIFIC_KEYS[issue.reason] : undefined) ??
		(kind === 'tool' && toolType
			? SPECIFIC_ISSUE_KEYS[`tool.${toolType}.${issue.code}`]
			: undefined) ??
		SPECIFIC_ISSUE_KEYS[`${kind}.${issue.code}`] ??
		GENERIC_ISSUE_KEYS[issue.code];
	const message = i18n.baseText(key, { interpolate: { id: id ?? '' } });

	return i18n.baseText('agents.builder.validation.tooltip.item' as BaseTextKey, {
		interpolate: { area: capabilityLabel(issue), issue: message },
	});
}

const details = computed(() => {
	const issues = props.action === 'preview' ? props.issues.filter(isPreviewIssue) : props.issues;
	return [...new Set(issues.map(issueMessage))];
});
</script>

<template>
	<N8nTooltip :disabled="props.disabled" :content="props.fallback" :content-class="$style.tooltip">
		<template #content>
			<div v-if="details.length > 0" :class="$style.content">
				<div :class="$style.heading">{{ heading }}</div>
				<ul :class="$style.list">
					<li v-for="detail in details" :key="detail">{{ detail }}</li>
				</ul>
			</div>
			<span v-else>{{ props.fallback }}</span>
		</template>
		<slot />
	</N8nTooltip>
</template>

<style lang="scss" module>
.tooltip {
	max-width: calc(var(--spacing--5xl) + var(--spacing--lg));
	align-items: stretch;
	white-space: normal;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.heading {
	font-weight: var(--font-weight--bold);
}

.list {
	margin: 0;
	padding-left: var(--spacing--sm);
}
</style>
