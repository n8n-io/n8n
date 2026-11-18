<script setup lang="ts">
import {
	N8nBadge,
	N8nButton,
	N8nCodeBlock,
	N8nCollapsiblePanel,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	formatTestDuration,
	type WorkflowTestRow,
	TEST_STATUS_DISPLAY,
} from '../workflowTests.display';

const props = defineProps<{
	row: WorkflowTestRow;
	/** The source of the test call, when the file still has it. */
	code?: string;
	/** Whether the workflow has the node that the error names, so the row can open it. */
	canOpenNode: boolean;
	canFix: boolean;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	fix: [];
	showCode: [];
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
	<N8nCollapsiblePanel
		v-model="expanded"
		:show-actions-on-hover="false"
		:class="[$style.row, $style[row.status]]"
		data-testid="workflow-tests-row"
	>
		<template #title>
			<span :class="$style.title">
				<N8nIcon
					:icon="display.icon"
					:spin="row.status === 'running'"
					:class="$style.statusIcon"
					size="medium"
				/>
				<N8nText size="small" :bold="row.status === 'failed'" :class="$style.name">
					{{ row.name }}
				</N8nText>
			</span>
		</template>
		<template #actions>
			<N8nBadge v-if="row.error?.code" variant="outline" size="xsmall" :class="$style.codeBadge">
				{{ row.error.code }}
			</N8nBadge>
			<N8nText v-if="row.durationMs !== undefined" size="xsmall" color="text-light">
				{{ formatTestDuration(row.durationMs) }}
			</N8nText>
			<N8nBadge :variant="display.badge" size="xsmall">
				{{ i18n.baseText(display.label) }}
			</N8nBadge>
		</template>

		<div :class="$style.details">
			<N8nText v-if="row.status === 'notRun'" size="small" color="text-light">
				{{ i18n.baseText('workflowTests.row.notRun') }}
			</N8nText>

			<section v-if="row.error" :class="$style.errorSection" data-testid="workflow-tests-row-error">
				<div :class="$style.errorHeader">
					<N8nText size="small" bold>{{ i18n.baseText('workflowTests.row.error') }}</N8nText>
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
			</section>

			<section v-if="code">
				<N8nText size="small" bold tag="p" :class="$style.sectionTitle">
					{{ i18n.baseText('workflowTests.row.code') }}
				</N8nText>
				<N8nCodeBlock :code="code" language="typescript" :max-height="240" />
			</section>

			<div :class="$style.actions">
				<N8nButton
					v-if="row.status === 'failed' && canFix"
					size="small"
					variant="outline"
					data-testid="workflow-tests-row-fix"
					data-attr="workflow-tests-row-fix"
					@click="emit('fix')"
				>
					<template #icon><N8nIcon icon="sparkles" /></template>
					{{ i18n.baseText('workflowTests.row.fixWithAssistant') }}
				</N8nButton>
				<N8nButton size="small" variant="ghost" @click="emit('showCode')">
					<template #icon><N8nIcon icon="code" /></template>
					{{ i18n.baseText('workflowTests.row.showInCode') }}
				</N8nButton>
			</div>
		</div>
	</N8nCollapsiblePanel>
</template>

<style module lang="scss">
.row {
	background-color: var(--background--surface);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--3xs) 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.passed .statusIcon {
	color: var(--color--success);
}

.failed .statusIcon {
	color: var(--color--danger);
}

.running .statusIcon {
	color: var(--color--primary);
}

.codeBadge {
	font-family: var(--font-family--monospace);
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xs);
}

.errorSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-left: var(--border-width) solid var(--color--danger);
	border-radius: var(--radius);
	background-color: color-mix(in srgb, var(--color--danger) 6%, transparent);
}

.errorHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
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

.sectionTitle {
	margin-bottom: var(--spacing--3xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
