<script lang="ts" setup>
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { computed, ref } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const { getToolLabel } = useToolLabel();
const isOpen = ref(false);

const displayName = computed(() => {
	const { toolName, args } = props.toolCall;
	const label = getToolLabel(toolName, args as Record<string, unknown>);
	if (toolName === 'research' && args.action === 'web-search' && typeof args.query === 'string') {
		return `${label}: "${args.query}"`;
	}
	if (toolName === 'research' && args.action === 'fetch-url' && typeof args.url === 'string') {
		return `${label}: ${args.url}`;
	}
	return label;
});

const showConfirmation = computed(
	() =>
		props.toolCall.confirmation &&
		props.toolCall.isLoading &&
		props.toolCall.confirmationStatus !== 'approved' &&
		props.toolCall.confirmationStatus !== 'denied' &&
		!store.resolvedConfirmationIds.has(props.toolCall.confirmation.requestId),
);

/** Resolved confirmation action — from backend or local optimistic state. */
const resolvedAction = computed((): 'approved' | 'denied' | 'deferred' | null => {
	// Local optimistic state takes priority (has richer semantics like 'deferred')
	const rid = props.toolCall.confirmation?.requestId;
	const local = rid ? store.resolvedConfirmationIds.get(rid) : undefined;
	if (local) return local;
	const status = props.toolCall.confirmationStatus;
	if (status === 'approved' || status === 'denied') return status;
	return null;
});
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen" :class="$style.root" data-test-id="instance-ai-tool-call">
		<CollapsibleTrigger :class="$style.trigger">
			<div :class="$style.triggerContent">
				<N8nIcon
					v-if="props.toolCall.isLoading"
					icon="spinner"
					color="primary"
					:class="$style.spinner"
					spin
					size="small"
				/>
				<N8nIcon
					v-else-if="props.toolCall.error !== undefined"
					icon="triangle-alert"
					:class="$style.errorIcon"
					size="small"
				/>
				<N8nIcon v-else icon="check" :class="$style.successIcon" size="small" />
				<span :class="$style.toolName">{{ displayName }}</span>
			</div>
			<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
		</CollapsibleTrigger>
		<AnimatedCollapsibleContent :class="$style.content">
			<div :class="$style.section">
				<div :class="$style.sectionLabel">{{ i18n.baseText('instanceAi.toolCall.input') }}</div>
				<ToolResultJson :value="props.toolCall.args" />
			</div>
			<div v-if="props.toolCall.error !== undefined" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.error') }}
				</div>
				<pre :class="[$style.json, $style.errorJson]">{{ props.toolCall.error }}</pre>
			</div>
			<div v-else-if="props.toolCall.result !== undefined" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.output') }}
				</div>
				<ToolResultRenderer
					:result="props.toolCall.result"
					:tool-name="props.toolCall.toolName"
					:tool-args="props.toolCall.args"
				/>
			</div>
			<div v-else-if="props.toolCall.isLoading" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.running') }}
				</div>
			</div>
		</AnimatedCollapsibleContent>

		<!-- Compact pending indicator — full confirmation UI is in the top-level panel -->
		<div v-if="showConfirmation" :class="$style.pendingIndicator">
			<N8nIcon icon="circle-pause" size="small" :class="$style.pendingIcon" />
			<span>{{ i18n.baseText('instanceAi.confirmation.pendingInline') }}</span>
		</div>

		<!-- Confirmation status indicator (after panel resolution or backend response) -->
		<div v-else-if="resolvedAction" :class="$style.confirmationStatus">
			<N8nIcon
				:icon="
					resolvedAction === 'approved'
						? 'check'
						: resolvedAction === 'deferred'
							? 'arrow-right'
							: 'x'
				"
				size="small"
				:class="
					resolvedAction === 'approved'
						? $style.successIcon
						: resolvedAction === 'deferred'
							? $style.deferredIcon
							: $style.errorIcon
				"
			/>
			<span>{{
				resolvedAction === 'approved'
					? i18n.baseText('instanceAi.confirmation.approved')
					: resolvedAction === 'deferred'
						? i18n.baseText('instanceAi.confirmation.deferred')
						: i18n.baseText('instanceAi.confirmation.denied')
			}}</span>
		</div>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.triggerContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	overflow: hidden;
	min-width: 0;
}

.toolName {
	font-weight: var(--font-weight--bold);
	font-family: monospace;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.spinner {
	color: var(--color--primary);
}

.errorIcon {
	color: var(--color--danger);
}

.successIcon {
	color: var(--color--success);
}

.content {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);
}

.section {
	& + & {
		margin-top: var(--spacing--2xs);
		padding-top: var(--spacing--2xs);
		border-top: 1px dashed var(--color--foreground);
	}
}

.sectionLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: var(--spacing--4xs);
}

.json {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--text--tint-1);
	max-height: 200px;
	overflow-y: auto;
}

.errorJson {
	color: var(--color--danger);
}

.pendingIndicator {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--warning);
	background: var(--color--background--shade-1);
}

.pendingIcon {
	color: var(--color--warning);
}

.deferredIcon {
	color: var(--color--text--tint-2);
}

.confirmationMessage {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.destructiveIcon {
	color: var(--color--danger);
}

.warningIcon {
	color: var(--color--warning);
}

.infoIcon {
	color: var(--color--primary);
}

.confirmationActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}

.confirmButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.denyButton {
	color: var(--color--text--tint-1);
}

.approveButton {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover {
		background: var(--color--primary--shade-1);
	}
}

.approveDestructive {
	background: var(--color--danger);
	color: var(--button--color--text--primary);
	border-color: var(--color--danger);

	&:hover {
		background: var(--color--danger--shade-1);
	}
}

.textInputWrapper {
	margin-bottom: var(--spacing--2xs);
}

.textInput {
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	background: var(--color--background);
	color: var(--color--text);
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.confirmationStatus {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
