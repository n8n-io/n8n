<script lang="ts" setup>
import type { InstanceAiRunDebugWorkflowCodeSnapshot } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import InstanceAiDebugJsonPanel from './InstanceAiDebugJsonPanel.vue';

const props = withDefaults(
	defineProps<{
		snapshot: InstanceAiRunDebugWorkflowCodeSnapshot;
		variant?: 'card' | 'inline';
		defaultOpen?: boolean;
	}>(),
	{
		variant: 'card',
		defaultOpen: false,
	},
);

const i18n = useI18n();

const summaryPreview = computed(() => {
	const parts = [
		formatStatus(props.snapshot.success),
		props.snapshot.source,
		formatCharCount(props.snapshot.code.length),
	];
	if (props.snapshot.workflowId) {
		parts.push(props.snapshot.workflowId);
	}
	return parts.join(' · ');
});

function formatTimestamp(ms: number): string {
	try {
		return new Date(ms).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
	} catch {
		return String(ms);
	}
}

function formatCharCount(count: number): string {
	return i18n.baseText('instanceAi.debug.runDebug.charCount', {
		interpolate: { count: count.toLocaleString() },
	});
}

function formatStatus(success: boolean): string {
	return success
		? i18n.baseText('instanceAi.debug.runDebug.success')
		: i18n.baseText('instanceAi.debug.runDebug.failed');
}
</script>

<template>
	<details v-if="variant === 'inline'" :class="$style.root" :open="defaultOpen">
		<summary :class="$style.summary">
			<span :class="$style.summaryLabel">
				{{ i18n.baseText('instanceAi.debug.tab.workflowCode') }}
			</span>
			<code :class="$style.preview">{{ summaryPreview }}</code>
		</summary>
		<div :class="$style.body">
			<div :class="$style.metaBlock">
				<span
					:class="[
						$style.statusChip,
						snapshot.success ? $style.statusSuccess : $style.statusFailed,
					]"
				>
					{{ formatStatus(snapshot.success) }}
				</span>
				<span v-if="snapshot.source" :class="$style.metaLabel">{{ snapshot.source }}</span>
				<span v-if="snapshot.workflowId" :class="$style.metaLabel">
					{{ snapshot.workflowId }}
				</span>
				<span :class="$style.metaLabel">{{ formatCharCount(snapshot.code.length) }}</span>
				<span :class="$style.metaLabel">{{ formatTimestamp(snapshot.capturedAt) }}</span>
			</div>

			<InstanceAiDebugJsonPanel
				v-if="snapshot.errors?.length"
				:value="snapshot.errors"
				:label="i18n.baseText('instanceAi.debug.runDebug.failed')"
			/>
			<InstanceAiDebugJsonPanel
				v-if="snapshot.patches"
				:value="snapshot.patches"
				:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
			/>

			<pre :class="$style.code">{{ snapshot.code }}</pre>
		</div>
	</details>

	<div v-else :class="$style.cardRoot">
		<div :class="$style.metaBlock">
			<span
				:class="[$style.statusChip, snapshot.success ? $style.statusSuccess : $style.statusFailed]"
			>
				{{ formatStatus(snapshot.success) }}
			</span>
			<span v-if="snapshot.source" :class="$style.metaLabel">{{ snapshot.source }}</span>
			<span v-if="snapshot.workflowId" :class="$style.metaLabel">
				{{ snapshot.workflowId }}
			</span>
			<span :class="$style.metaLabel">{{ formatCharCount(snapshot.code.length) }}</span>
			<span :class="$style.metaLabel">{{ formatTimestamp(snapshot.capturedAt) }}</span>
		</div>

		<InstanceAiDebugJsonPanel
			v-if="snapshot.errors?.length"
			:value="snapshot.errors"
			:label="i18n.baseText('instanceAi.debug.runDebug.failed')"
		/>
		<InstanceAiDebugJsonPanel
			v-if="snapshot.patches"
			:value="snapshot.patches"
			:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
		/>

		<pre :class="$style.code">{{ snapshot.code }}</pre>
	</div>
</template>

<style lang="scss" module>
.root {
	border: 1px solid var(--color--foreground--tint-2);
	border-radius: var(--radius);
	background: var(--color--background--shade-1);
	overflow: hidden;
}

.summary {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	cursor: pointer;
	list-style: none;
	user-select: none;

	&::-webkit-details-marker {
		display: none;
	}

	&::before {
		content: '▸';
		flex-shrink: 0;
		color: var(--color--text--tint-1);
		transition: transform var(--duration--fast) ease;
	}
}

.root[open] .summary::before {
	transform: rotate(90deg);
}

.summaryLabel {
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
}

.preview {
	flex: 1;
	min-width: 0;
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground--tint-2);
	background: var(--background--surface);
}

.cardRoot {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.metaBlock {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.metaLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	font-family: monospace;
}

.statusChip {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--xl);
	font-size: var(--font-size--3xs);
	text-transform: lowercase;
}

.statusSuccess {
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	color: var(--color--success);
}

.statusFailed {
	background: color-mix(in srgb, var(--color--danger) 15%, transparent);
	color: var(--color--danger);
}

.code {
	margin: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 1px solid var(--color--foreground--tint-2);
	border-radius: var(--radius);
	background: var(--color--background--shade-1);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
	max-height: 420px;
	overflow-y: auto;
}
</style>
