<script setup lang="ts">
import type { AgentCapabilityKind, AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { isWarningIssue } from '../utils/validationIssues';
import { workflowToolTriggerLabel } from '../utils/workflowToolTriggers';

const props = withDefaults(
	defineProps<{
		disabled: boolean;
		fallback: string;
		action: 'publish' | 'preview';
		issues?: AgentConfigValidationIssue[];
	}>(),
	{ issues: () => [] },
);

const MAX_VISIBLE_DETAILS = 5;

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
	not_published: 'agents.builder.validation.issue.tool.workflow.notPublished' as BaseTextKey,
};

const PREVIEW_REASON_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	incompatible_nodes: 'agents.builder.preview.issue.tool.workflow.incompatibleNodes' as BaseTextKey,
	no_supported_trigger:
		'agents.builder.preview.issue.tool.workflow.noSupportedTrigger' as BaseTextKey,
};

const PUBLISH_REASON_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	incompatible_nodes: 'agents.publish.issue.tool.workflow.incompatibleNodes' as BaseTextKey,
	no_supported_trigger: 'agents.publish.issue.tool.workflow.noSupportedTrigger' as BaseTextKey,
	not_published: 'agents.publish.issue.tool.workflow.notPublished' as BaseTextKey,
};

const CORE_PATH_KEYS: Record<string, BaseTextKey> = {
	instructions: 'agents.chat.misconfigured.missing.instructions' as BaseTextKey,
	model: 'agents.chat.misconfigured.missing.model' as BaseTextKey,
	credential: 'agents.chat.misconfigured.missing.credential' as BaseTextKey,
};

const PREVIEW_PATH_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	'agent.instructions.missing_required':
		'agents.builder.preview.issue.agent.instructions.missingRequired' as BaseTextKey,
	'agent.model.missing_required':
		'agents.builder.preview.issue.agent.model.missingRequired' as BaseTextKey,
	'agent.model.invalid_value':
		'agents.builder.preview.issue.agent.model.invalidValue' as BaseTextKey,
	'agent.credential.missing_credential':
		'agents.builder.preview.issue.agent.credential.missingCredential' as BaseTextKey,
	'agent.credential.invalid_credential':
		'agents.builder.preview.issue.agent.credential.invalidCredential' as BaseTextKey,
	'agent.credential.incompatible_credential':
		'agents.builder.preview.issue.agent.credential.incompatibleCredential' as BaseTextKey,
	'agent.modelDeploymentName.missing_required':
		'agents.builder.preview.issue.agent.modelDeploymentName.missingRequired' as BaseTextKey,
	'mcpServer.url.missing_required':
		'agents.builder.preview.issue.mcpServer.missingRequired' as BaseTextKey,
};

const PUBLISH_PATH_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	'agent.instructions.missing_required':
		'agents.publish.issue.agent.instructions.missingRequired' as BaseTextKey,
	'agent.model.missing_required': 'agents.publish.issue.agent.model.missingRequired' as BaseTextKey,
	'agent.model.invalid_value': 'agents.publish.issue.agent.model.invalidValue' as BaseTextKey,
	'agent.credential.missing_credential':
		'agents.publish.issue.agent.credential.missingCredential' as BaseTextKey,
	'agent.credential.invalid_credential':
		'agents.publish.issue.agent.credential.invalidCredential' as BaseTextKey,
	'agent.credential.incompatible_credential':
		'agents.publish.issue.agent.credential.incompatibleCredential' as BaseTextKey,
	'agent.modelDeploymentName.missing_required':
		'agents.publish.issue.agent.modelDeploymentName.missingRequired' as BaseTextKey,
	'mcpServer.url.missing_required': 'agents.publish.issue.mcpServer.missingRequired' as BaseTextKey,
	'tool.node.url.invalid_value': 'agents.publish.issue.tool.node.url.invalidValue' as BaseTextKey,
};

const PREVIEW_SPECIFIC_ISSUE_KEYS: Record<string, BaseTextKey> = {
	'subAgent.missing_reference':
		'agents.builder.preview.issue.subAgent.missingReference' as BaseTextKey,
	'subAgent.incompatible_reference':
		'agents.builder.preview.issue.subAgent.incompatibleReference' as BaseTextKey,
	'skill.missing_reference': 'agents.builder.preview.issue.skill.missingReference' as BaseTextKey,
	'tool.workflow.missing_reference':
		'agents.builder.preview.issue.tool.workflow.missingReference' as BaseTextKey,
	'tool.workflow.incompatible_reference':
		'agents.builder.preview.issue.tool.workflow.incompatibleReference' as BaseTextKey,
	'tool.custom.missing_reference':
		'agents.builder.preview.issue.tool.custom.missingReference' as BaseTextKey,
	'tool.node.missing_reference':
		'agents.builder.preview.issue.tool.node.missingReference' as BaseTextKey,
	'tool.node.missing_credential':
		'agents.builder.preview.issue.tool.node.missingCredential' as BaseTextKey,
	'tool.node.invalid_credential':
		'agents.builder.preview.issue.tool.node.invalidCredential' as BaseTextKey,
	'mcpServer.missing_credential':
		'agents.builder.preview.issue.mcpServer.missingCredential' as BaseTextKey,
	'mcpServer.invalid_credential':
		'agents.builder.preview.issue.mcpServer.invalidCredential' as BaseTextKey,
	'mcpServer.incompatible_credential':
		'agents.builder.preview.issue.mcpServer.incompatibleCredential' as BaseTextKey,
	'vectorStore.invalid_value':
		'agents.builder.preview.issue.vectorStore.invalidValue' as BaseTextKey,
};

const PUBLISH_SPECIFIC_ISSUE_KEYS: Record<string, BaseTextKey> = {
	'channel.missing_credential': 'agents.publish.issue.channel.missingCredential' as BaseTextKey,
	'channel.invalid_credential': 'agents.publish.issue.channel.invalidCredential' as BaseTextKey,
	'channel.incompatible_credential':
		'agents.publish.issue.channel.incompatibleCredential' as BaseTextKey,
	'subAgent.missing_reference': 'agents.publish.issue.subAgent.missingReference' as BaseTextKey,
	'subAgent.incompatible_reference':
		'agents.publish.issue.subAgent.incompatibleReference' as BaseTextKey,
	'skill.missing_reference': 'agents.publish.issue.skill.missingReference' as BaseTextKey,
	'task.missing_reference': 'agents.publish.issue.task.missingReference' as BaseTextKey,
	'task.invalid_value': 'agents.publish.issue.task.invalidValue' as BaseTextKey,
	'tool.workflow.missing_reference':
		'agents.publish.issue.tool.workflow.missingReference' as BaseTextKey,
	'tool.workflow.incompatible_reference':
		'agents.publish.issue.tool.workflow.incompatibleReference' as BaseTextKey,
	'tool.custom.missing_reference':
		'agents.publish.issue.tool.custom.missingReference' as BaseTextKey,
	'tool.node.missing_reference': 'agents.publish.issue.tool.node.missingReference' as BaseTextKey,
	'tool.node.missing_credential': 'agents.publish.issue.tool.node.missingCredential' as BaseTextKey,
	'tool.node.invalid_credential': 'agents.publish.issue.tool.node.invalidCredential' as BaseTextKey,
	'mcpServer.missing_credential': 'agents.publish.issue.mcpServer.missingCredential' as BaseTextKey,
	'mcpServer.invalid_credential': 'agents.publish.issue.mcpServer.invalidCredential' as BaseTextKey,
	'mcpServer.incompatible_credential':
		'agents.publish.issue.mcpServer.incompatibleCredential' as BaseTextKey,
	'vectorStore.invalid_value': 'agents.publish.issue.vectorStore.invalidValue' as BaseTextKey,
};

const CAPABILITY_KEYS: Record<AgentCapabilityKind, BaseTextKey> = {
	agent: 'agents.chat.misconfigured.missing.agent' as BaseTextKey,
	channel: 'agents.builder.triggers.title' as BaseTextKey,
	tool: 'agents.chat.misconfigured.missing.tools' as BaseTextKey,
	mcpServer: 'agents.chat.misconfigured.missing.mcpServers' as BaseTextKey,
	skill: 'agents.builder.sections.skills' as BaseTextKey,
	task: 'agents.builder.tasks.title' as BaseTextKey,
	subAgent: 'agents.chat.misconfigured.missing.subAgents.agents' as BaseTextKey,
	vectorStore: 'agents.builder.vectorStores.panel.title' as BaseTextKey,
};

function isPreviewIssue(issue: AgentConfigValidationIssue): boolean {
	if (issue.capability.kind === 'channel' || issue.capability.kind === 'task') return false;
	if (isWarningIssue(issue)) return false;

	// Fixed URLs are required for publishing, but the draft preview can still run.
	return !(issue.code === 'invalid_value' && issue.path.endsWith('.node.nodeParameters.url'));
}

function capabilityLabel(issue: AgentConfigValidationIssue): string {
	const corePathKey = issue.capability.kind === 'agent' ? CORE_PATH_KEYS[issue.path] : undefined;
	return i18n.baseText(corePathKey ?? CAPABILITY_KEYS[issue.capability.kind]);
}

function previewPathKey(issue: AgentConfigValidationIssue): string | undefined {
	if (issue.capability.kind === 'agent') return `agent.${issue.path}.${issue.code}`;
	if (issue.capability.kind === 'mcpServer' && issue.path.endsWith('.url')) {
		return `mcpServer.url.${issue.code}`;
	}
	if (
		issue.capability.kind === 'tool' &&
		issue.capability.toolType === 'node' &&
		issue.path.endsWith('.node.nodeParameters.url')
	) {
		return `tool.node.url.${issue.code}`;
	}
	return undefined;
}

function issueMessage(issue: AgentConfigValidationIssue): string {
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
	const message = i18n.baseText(key, {
		interpolate: { id: id ?? '', trigger: workflowToolTriggerLabel() },
	});

	return `${capabilityLabel(issue)}: ${message}`;
}

function previewIssueMessage(issue: AgentConfigValidationIssue): string {
	return actionIssueMessage(
		issue,
		PREVIEW_REASON_SPECIFIC_KEYS,
		PREVIEW_PATH_SPECIFIC_KEYS,
		PREVIEW_SPECIFIC_ISSUE_KEYS,
	);
}

function publishIssueMessage(issue: AgentConfigValidationIssue): string {
	return actionIssueMessage(
		issue,
		PUBLISH_REASON_SPECIFIC_KEYS,
		PUBLISH_PATH_SPECIFIC_KEYS,
		PUBLISH_SPECIFIC_ISSUE_KEYS,
	);
}

function actionIssueMessage(
	issue: AgentConfigValidationIssue,
	reasonSpecificKeys: Record<string, BaseTextKey>,
	pathSpecificKeys: Record<string, BaseTextKey>,
	specificIssueKeys: Record<string, BaseTextKey>,
): string {
	const { kind, toolType, id } = issue.capability;
	const pathKey = previewPathKey(issue);
	const key =
		(issue.reason ? reasonSpecificKeys[issue.reason] : undefined) ??
		(pathKey ? pathSpecificKeys[pathKey] : undefined) ??
		(kind === 'tool' && toolType
			? specificIssueKeys[`tool.${toolType}.${issue.code}`]
			: undefined) ??
		specificIssueKeys[`${kind}.${issue.code}`];

	if (!key) return issueMessage(issue);

	return i18n.baseText(key, {
		interpolate: { id: id ?? '', trigger: workflowToolTriggerLabel() },
	});
}

const isPreview = computed(() => props.action === 'preview');
const details = computed(() => {
	const issues = isPreview.value ? props.issues.filter(isPreviewIssue) : props.issues;
	return [
		...new Set(
			issues.map((issue) =>
				isPreview.value ? previewIssueMessage(issue) : publishIssueMessage(issue),
			),
		),
	];
});

const visibleDetails = computed(() => details.value.slice(0, MAX_VISIBLE_DETAILS));
const hiddenDetailsCount = computed(() => Math.max(details.value.length - MAX_VISIBLE_DETAILS, 0));
const overflowLabel = computed(() =>
	hiddenDetailsCount.value > 0
		? i18n.baseText('agents.validationTooltip.more' as BaseTextKey, {
				interpolate: { count: hiddenDetailsCount.value },
			})
		: '',
);
</script>

<template>
	<N8nTooltip :disabled="props.disabled" :content="props.fallback" :content-class="$style.tooltip">
		<template #content>
			<div v-if="details.length > 0" :class="$style.content">
				<div :class="$style.heading">{{ props.fallback }}</div>
				<div :class="$style.previewDetails">
					<div v-for="detail in visibleDetails" :key="detail">{{ detail }}</div>
					<div v-if="hiddenDetailsCount > 0">{{ overflowLabel }}</div>
				</div>
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

.previewDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
</style>
