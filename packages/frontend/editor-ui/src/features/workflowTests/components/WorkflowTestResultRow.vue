<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nText, N8nVisuallyHidden } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	formatTestDuration,
	type WorkflowTestRow,
	TEST_STATUS_DISPLAY,
} from '../workflowTests.display';

const props = defineProps<{
	row: WorkflowTestRow;
	expanded: boolean;
	selected: boolean;
	/** Whether the workflow has the node that the error names, so the row can open it. */
	canOpenNode: boolean;
	canFix: boolean;
}>();

const emit = defineEmits<{
	select: [];
	fix: [];
	openNode: [node: string];
}>();

const i18n = useI18n();

const display = computed(() => TEST_STATUS_DISPLAY[props.row.status]);

const hint = computed(() => {
	const code = props.row.error?.code;
	if (!code) return undefined;
	const key = `workflowTests.hint.${code}` as BaseTextKey;
	const text = i18n.baseText(key);
	// `baseText` returns the key itself for a code without a hint.
	return text === key ? undefined : text;
});
</script>

<template>
	<div :class="$style[row.status]" :data-status="row.status" data-testid="workflow-tests-row">
		<button
			type="button"
			:class="[$style.summary, { [$style.selected]: selected }]"
			:aria-expanded="row.error ? expanded : undefined"
			@click="emit('select')"
		>
			<N8nIcon :key="row.status" :icon="display.icon" :class="$style.statusIcon" size="medium" />
			<N8nVisuallyHidden>{{ i18n.baseText(display.label) }}</N8nVisuallyHidden>
			<N8nText size="small" :bold="row.status === 'failed'" :class="$style.name" :title="row.name">
				{{ row.name }}
			</N8nText>
			<N8nText
				v-if="row.durationMs !== undefined"
				size="xsmall"
				color="text-light"
				:class="$style.duration"
			>
				{{ formatTestDuration(row.durationMs) }}
			</N8nText>
			<N8nIcon
				v-if="row.error"
				icon="chevron-right"
				size="small"
				:class="[$style.chevron, { [$style.open]: expanded }]"
			/>
		</button>

		<section
			v-if="row.error && expanded"
			:class="$style.error"
			data-testid="workflow-tests-row-error"
		>
			<div v-if="row.error.code || row.error.node" :class="$style.errorHeader">
				<N8nBadge v-if="row.error.code" variant="outline" size="xsmall" :class="$style.codeBadge">
					{{ row.error.code }}
				</N8nBadge>
				<N8nBadge
					v-if="row.error.node"
					:clickable="canOpenNode"
					:disabled="!canOpenNode"
					variant="subtle"
					size="small"
					leading-icon="box"
					:trailing-icon="canOpenNode ? 'external-link' : undefined"
					:aria-label="
						i18n.baseText('workflowTests.row.openNode', { interpolate: { node: row.error.node } })
					"
					@click="canOpenNode && row.error.node && emit('openNode', row.error.node)"
				>
					{{ row.error.node }}
				</N8nBadge>
			</div>
			<pre :class="$style.message">{{ row.error.message }}</pre>
			<div v-if="hint" :class="$style.hint">
				<N8nIcon icon="lightbulb" size="small" />
				<N8nText size="small">{{ hint }}</N8nText>
			</div>
			<div v-if="canFix">
				<N8nButton
					size="small"
					variant="outline"
					data-testid="workflow-tests-row-fix"
					data-attr="workflow-tests-row-fix"
					@click="emit('fix')"
				>
					<template #icon><N8nIcon icon="sparkles" /></template>
					{{ i18n.baseText('workflowTests.row.fixWithAssistant') }}
				</N8nButton>
			</div>
		</section>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.summary {
	composes: row from './testRow.module.scss';
}

.selected,
.selected:hover {
	background-color: color-mix(in srgb, var(--color--primary) 8%, transparent);
}

.name {
	composes: name from './testRow.module.scss';
}

.duration {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.statusIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);

	@include motion.fade-in;
}

.passed .statusIcon {
	color: var(--color--success);
}

.failed .statusIcon {
	color: var(--color--danger);
}

.running .statusIcon {
	@include motion.opacity-pulse;
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.open {
	transform: rotate(90deg);
}

.error {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--4xs) 0 var(--spacing--2xs) var(--spacing--lg);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-left: var(--border-width) solid var(--color--danger);
	border-radius: var(--radius--3xs);
	background-color: color-mix(in srgb, var(--color--danger) 6%, transparent);

	@include motion.fade-in;
}

.errorHeader {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.codeBadge {
	font-family: var(--font-family--monospace);
}

.message {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
}

.hint {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	color: var(--color--text--tint-1);
}
</style>
