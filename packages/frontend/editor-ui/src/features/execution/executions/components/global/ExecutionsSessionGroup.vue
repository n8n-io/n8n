<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import type { ExecutionSummaryWithScopes } from '../../executions.types';
import { CALLER_SOURCE_LABEL, formatSessionShortId } from '../../executions.utils';

/**
 * Session-grouped header row. Renders as a `<tr>` so it sits inside the
 * surrounding executions `<tbody>` and shares the same column widths as the
 * regular rows — no nested table, no floating pill. The expand state controls
 * whether the slotted child rows are rendered into the same `<tbody>` below
 * this header.
 *
 * Interaction model:
 *   - Click anywhere on the row → toggle expand/collapse inline.
 *   - The chevron is purely a visual cue (the full row is the click target).
 *   - Enter/Space on the focused row toggles the same way for keyboard users.
 */

const props = withDefaults(
	defineProps<{
		sessionId: string;
		executions: ExecutionSummaryWithScopes[];
		defaultExpanded?: boolean;
	}>(),
	{ defaultExpanded: undefined },
);

const emit = defineEmits<{
	toggle: [expanded: boolean];
}>();

const locale = useI18n();
const expanded = ref(props.defaultExpanded ?? props.executions.length <= 5);

const callerKind = computed(() => props.executions[0]?.caller?.kind ?? 'mcp');
const callerName = computed(() => props.executions[0]?.caller?.name ?? '');
const callerBadgeText = computed(
	() => CALLER_SOURCE_LABEL[callerKind.value] ?? callerKind.value.toUpperCase(),
);

// Header context can afford a longer id than the per-row chip — show up to 32
// chars and let CSS ellipsize when the cell is too narrow. The full id remains
// available on hover via the title attribute.
const sessionLabel = computed(() => formatSessionShortId(props.sessionId, 32));

const rollup = computed(() => {
	const success = props.executions.filter((e) => e.status === 'success').length;
	const error = props.executions.filter(
		(e) => e.status === 'error' || e.status === 'crashed',
	).length;
	return { success, error };
});

function toggleExpanded() {
	expanded.value = !expanded.value;
	emit('toggle', expanded.value);
}
</script>

<!-- eslint-disable vue/no-multiple-template-root -->
<template>
	<tr
		:class="$style.sessionRow"
		data-test-id="executions-session-group"
		role="button"
		tabindex="0"
		:aria-expanded="expanded"
		@click="toggleExpanded"
		@keydown.enter.prevent="toggleExpanded"
		@keydown.space.prevent="toggleExpanded"
	>
		<td
			:class="$style.chevronCell"
			data-test-id="executions-session-group-toggle"
			aria-hidden="true"
		>
			<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
		</td>
		<td colspan="6" :class="$style.labelCell" data-test-id="executions-session-group-header">
			<span :class="$style.label">
				<N8nText size="small" bold :class="$style.sessionId" :title="sessionId">{{
					sessionLabel
				}}</N8nText>
				<N8nText size="xsmall" color="text-light" :class="$style.separator">·</N8nText>
				<N8nBadge :class="[$style.kindBadge, $style[`kind-${callerKind}`]]" :show-border="false">
					{{ callerBadgeText }}
				</N8nBadge>
				<N8nText v-if="callerName" size="xsmall" color="text-light" :class="$style.callerName">
					{{ callerName }}
				</N8nText>
				<N8nText size="xsmall" color="text-light" :class="$style.separator">·</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{
						locale.baseText('executionsList.session.calls', {
							interpolate: { count: executions.length },
						})
					}}
				</N8nText>
			</span>
		</td>
		<td colspan="2" :class="$style.rollupCell">
			<span :class="$style.rollup">
				<N8nText v-if="rollup.success > 0" size="xsmall" color="success"
					>{{ rollup.success }}✓</N8nText
				>
				<N8nText v-if="rollup.error > 0" size="xsmall" color="danger">{{ rollup.error }}✗</N8nText>
			</span>
		</td>
	</tr>
	<template v-if="expanded">
		<slot :executions="executions" :caller-kind="callerKind" />
	</template>
</template>

<style lang="scss" module>
.sessionRow {
	background: var(--color--background--shade-1);
	cursor: pointer;
	user-select: none;

	&:hover {
		background: var(--color--background--shade-1);
		filter: brightness(0.98);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
	}
}

.chevronCell {
	width: 50px;
	text-align: center;
}

.labelCell {
	min-width: 0;
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.sessionId {
	font-family: var(--font-family--monospace);
	color: var(--color--text--shade-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	flex: 1 1 auto;
	max-width: 36ch;
}

.separator {
	user-select: none;
	flex: 0 0 auto;
}

.callerName {
	max-width: 16ch;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 0 0 auto;
}

.kindBadge {
	font-family: var(--font-family);
	flex: 0 0 auto;
}

.kind-mcp {
	background: var(--color--primary--tint-2);
	color: var(--color--primary--shade-1);
}
.kind-cli {
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
}
.kind-sdk {
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}
.kind-instance-ai {
	background: var(--color--secondary--tint-2);
	color: var(--color--secondary--shade-1);
}

.rollupCell {
	text-align: right;
}

.rollup {
	display: inline-flex;
	gap: var(--spacing--2xs);
	align-items: center;
}
</style>
