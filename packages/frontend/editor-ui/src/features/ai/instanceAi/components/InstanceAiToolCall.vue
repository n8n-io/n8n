<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import ToolResultRenderer from './ToolResultRenderer.vue';
import ToolResultJson from './ToolResultJson.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const { getToolLabel } = useToolLabel();
const isOpen = ref(false);

const displayName = computed(() => {
	const { toolName, args } = props.toolCall;
	const label = getToolLabel(toolName);
	if (toolName === 'web-search' && typeof args.query === 'string') {
		return `${label}: "${args.query}"`;
	}
	if (toolName === 'fetch-url' && typeof args.url === 'string') {
		return `${label}: ${args.url}`;
	}
	return label;
});

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
		<CollapsibleContent :class="$style.content">
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
				<ToolResultRenderer :result="props.toolCall.result" :tool-name="props.toolCall.toolName" />
			</div>
			<div v-else-if="props.toolCall.isLoading" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.running') }}
				</div>
			</div>
		</CollapsibleContent>

		<!-- Confirmation status indicator (after resolution or backend response) -->
		<div v-if="resolvedAction" :class="$style.confirmationStatus">
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
	margin: var(--spacing--4xs) 0;
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) 0;
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);

	&:hover {
		color: var(--color--text);
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
	padding: var(--spacing--2xs) 0 var(--spacing--2xs) var(--spacing--sm);
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
	color: var(--text-color--subtle);
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
	color: var(--text-color--subtle);
	max-height: 200px;
	overflow-y: auto;
}

.errorJson {
	color: var(--color--danger);
}

.deferredIcon {
	color: var(--text-color--subtler);
}

.confirmationStatus {
	padding: var(--spacing--4xs) 0 var(--spacing--4xs) var(--spacing--sm);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
</style>
