<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentComputerUseApprovalInput, AgentComputerUseApprovalResume } from '@n8n/api-types';

const props = defineProps<{
	input: AgentComputerUseApprovalInput;
	disabled?: boolean;
	resolvedValue?: AgentComputerUseApprovalResume;
}>();

const emit = defineEmits<{
	submit: [resumeData: AgentComputerUseApprovalResume];
}>();

const i18n = useI18n();

const primaryResource = computed(() => props.input.resources[0]);
const resourcesWithPreview = computed(() =>
	props.input.resources.filter((resource) => resource.preview !== undefined),
);

const actionText = computed(() => {
	if (primaryResource.value?.toolGroup === 'shell') return primaryResource.value.resource;
	if (primaryResource.value?.toolGroup === 'process') return primaryResource.value.description;
	return primaryResource.value?.resource ?? props.input.toolName;
});

function approve() {
	if (props.disabled) return;
	emit('submit', { approved: true });
}

function deny() {
	if (props.disabled) return;
	emit('submit', { approved: false });
}
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="approval-card">
		<div :class="$style.cardBody">
			<div :class="$style.titleRow">
				<N8nIcon icon="triangle-alert" size="small" />
				<N8nText tag="p" bold :class="$style.title">
					{{ i18n.baseText('agents.chat.approval.title') }}
				</N8nText>
			</div>

			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('agents.chat.approval.description', {
						interpolate: { tool: input.toolName },
					})
				}}
			</N8nText>

			<code :class="$style.action">{{ actionText }}</code>

			<div v-if="input.resources.length > 1" :class="$style.resources">
				<N8nText
					v-for="resource in input.resources.slice(1)"
					:key="resource.resource"
					size="xsmall"
					color="text-light"
				>
					{{ resource.description }}
				</N8nText>
			</div>

			<div v-if="resourcesWithPreview.length > 0" :class="$style.previews">
				<div
					v-for="resource in resourcesWithPreview"
					:key="`${resource.resource}-preview`"
					:class="$style.preview"
				>
					<N8nText size="xsmall" bold>
						{{ resource.preview?.title ?? resource.description }}
					</N8nText>
					<pre :class="$style.previewContent">{{ resource.preview?.content }}</pre>
					<N8nText v-if="resource.preview?.truncated" size="xsmall" color="text-light">
						{{ i18n.baseText('agents.chat.approval.previewTruncated') }}
					</N8nText>
				</div>
			</div>

			<div v-if="disabled && resolvedValue" :class="$style.resolved">
				<N8nIcon
					:icon="resolvedValue.approved ? 'circle-check' : 'circle-x'"
					size="small"
					:color="resolvedValue.approved ? 'success' : 'danger'"
				/>
				<N8nText size="small">
					{{
						resolvedValue.approved
							? i18n.baseText('agents.chat.approval.approved')
							: i18n.baseText('agents.chat.approval.denied')
					}}
				</N8nText>
			</div>

			<div v-else :class="$style.actions">
				<N8nButton
					size="small"
					type="secondary"
					:disabled="disabled"
					data-testid="approval-card-deny"
					@click="deny"
				>
					<template #prefix><N8nIcon icon="x" :size="14" /></template>
					{{ i18n.baseText('agents.chat.approval.deny') }}
				</N8nButton>
				<N8nButton
					size="small"
					type="primary"
					:disabled="disabled"
					data-testid="approval-card-approve"
					@click="approve"
				>
					<template #prefix><N8nIcon icon="check" :size="14" /></template>
					{{ i18n.baseText('agents.chat.approval.approve') }}
				</N8nButton>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	gap: var(--spacing--xs);
	width: 90%;
	max-width: 90%;
}

.disabled {
	opacity: 0.75;
	pointer-events: none;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.titleRow,
.resolved,
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--sm);
}

.action {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--foreground--xlight);
	font-size: var(--font-size--xs);
}

.resources {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.previews {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.preview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.previewContent {
	max-height: 240px;
	margin: 0;
	overflow: auto;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--foreground--xlight);
	font-family: var(--font-family-monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--font-line-height--compact);
	white-space: pre-wrap;
	word-break: break-word;
}

.actions {
	justify-content: flex-end;
}
</style>
