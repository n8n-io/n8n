<script setup lang="ts">
import type { OperatorLogRecord } from '@n8n/api-types';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';

import { formatLogTime, hostColorToken, shortHostId } from '../operatorConsole.utils';

const props = defineProps<{
	record: OperatorLogRecord;
	expanded: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const i18n = useI18n();

const gutterStyle = computed(() => ({
	'--operator-console--host-color': `var(${hostColorToken(props.record.hostId)})`,
}));

const roleLabel = computed(() => i18n.baseText(`operatorConsole.role.${props.record.role}`));

const levelLabel = computed(() => i18n.baseText(`operatorConsole.level.${props.record.level}`));

const timestamp = computed(() => formatLogTime(props.record.ts));

/**
 * The execution link needs both ids — a record stamped only with `executionId`
 * (e.g. one emitted from a detached callback) renders as plain text rather than
 * a link that would land on a non-existent route.
 */
const executionRoute = computed(() => {
	const { executionId, workflowId } = props.record;
	if (!executionId || !workflowId) return null;
	return { name: VIEWS.EXECUTION_PREVIEW, params: { workflowId, executionId } };
});

const detail = computed(() => ({
	seq: props.record.seq,
	ts: props.record.ts,
	hostId: props.record.hostId,
	role: props.record.role,
	stream: props.record.stream,
	level: props.record.level,
	origin: props.record.origin,
	scope: props.record.scope,
	executionId: props.record.executionId,
	workflowId: props.record.workflowId,
	nodeName: props.record.nodeName,
	meta: props.record.meta,
}));

const detailJson = computed(() => JSON.stringify(detail.value, null, 2));
</script>

<template>
	<div :class="$style.row" :style="gutterStyle" data-test-id="operator-console-row">
		<div :class="$style.line">
			<button
				type="button"
				:class="$style.toggle"
				:aria-expanded="expanded"
				:aria-label="
					expanded
						? i18n.baseText('operatorConsole.row.collapse')
						: i18n.baseText('operatorConsole.row.expand')
				"
				data-test-id="operator-console-row-toggle"
				@click="emit('toggle')"
			>
				<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="xsmall" />
			</button>

			<span :class="$style.gutter" aria-hidden="true"></span>

			<N8nTooltip :content="record.hostId" placement="top">
				<span :class="$style.host">{{ shortHostId(record.hostId) }}</span>
			</N8nTooltip>

			<N8nBadge :class="$style.role" size="small" theme="tertiary">{{ roleLabel }}</N8nBadge>

			<span :class="$style.time">{{ timestamp }}</span>

			<span :class="[$style.level, $style[record.level]]" :title="levelLabel">{{
				record.level
			}}</span>

			<span v-if="record.scope" :class="$style.scope">{{ record.scope }}</span>

			<span v-if="record.stream !== 'log'" :class="$style.stream">{{ record.stream }}</span>

			<span
				:class="[
					$style.message,
					$style[`message-${record.level}`],
					{ [$style.messageClamped]: !expanded },
				]"
				>{{ record.message }}</span
			>

			<RouterLink
				v-if="executionRoute"
				:to="executionRoute"
				:class="$style.execution"
				data-test-id="operator-console-execution-link"
			>
				{{
					i18n.baseText('operatorConsole.row.executionLink', {
						interpolate: { executionId: record.executionId ?? '' },
					})
				}}
			</RouterLink>
			<span v-else-if="record.executionId" :class="$style.execution">{{
				i18n.baseText('operatorConsole.row.executionLink', {
					interpolate: { executionId: record.executionId },
				})
			}}</span>

			<N8nTooltip v-if="record.truncated" :content="i18n.baseText('operatorConsole.row.truncated')">
				<N8nIcon :class="$style.truncated" icon="scissors" size="xsmall" />
			</N8nTooltip>
		</div>

		<pre v-if="expanded" :class="$style.detail" data-test-id="operator-console-row-detail">{{
			detailJson
		}}</pre>
	</div>
</template>

<style module lang="scss">
/*
 * Terminal palette, matching what `winston.format.colorize` prints in dev mode:
 * error red, warn yellow, info green, debug blue.
 *
 * Deliberately palette primitives rather than the `--text-color--*` semantic
 * tokens. Those are tuned for text on a *tinted* callout background, so in dark
 * theme `--text-color--danger` resolves to `--color--red-50` — 97% lightness,
 * near-white. Correct for a red-backed banner, invisible as a signal on a
 * neutral log surface.
 */
@mixin level-colors($error, $warn, $info, $debug) {
	--operator-console--level--error: var(#{$error});
	--operator-console--level--warn: var(#{$warn});
	--operator-console--level--info: var(#{$info});
	--operator-console--level--debug: var(#{$debug});
}

/* Brighter on dark, where the surface can carry more saturation. */
:global([data-theme='dark']) .row {
	@include level-colors(
		--color--red-400,
		--color--yellow-400,
		--color--green-400,
		--color--blue-400
	);
}

@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .row {
		@include level-colors(
			--color--red-400,
			--color--yellow-400,
			--color--green-400,
			--color--blue-400
		);
	}
}

.row {
	/* Mid shades: legible on a light surface without going muddy. */
	@include level-colors(
		--color--red-600,
		--color--yellow-700,
		--color--green-600,
		--color--blue-600
	);

	display: flex;
	flex-direction: column;
	width: 100%;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	border-bottom: var(--border);
	box-sizing: border-box;
}

.row:hover {
	background-color: var(--background--hover);
}

.line {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	min-width: 0;
}

.toggle {
	display: flex;
	align-items: center;
	padding: 0;
	border: none;
	background: none;
	color: var(--icon-color);
	cursor: pointer;
}

.gutter {
	flex-shrink: 0;
	align-self: stretch;
	width: var(--spacing--5xs);
	border-radius: var(--radius--full);
	background-color: var(--operator-console--host-color);
}

.host {
	flex-shrink: 0;
	color: var(--operator-console--host-color);
}

.role {
	flex-shrink: 0;
}

.time {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.level {
	flex-shrink: 0;
	text-transform: uppercase;
}

.error,
.message-error {
	color: var(--operator-console--level--error);
}

.warn,
.message-warn {
	color: var(--operator-console--level--warn);
}

.info,
.message-info {
	color: var(--operator-console--level--info);
}

/* Level word and its message share one colour so the line reads as a unit. */
.debug,
.message-debug {
	color: var(--operator-console--level--debug);
}

.scope,
.stream {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

/* Tinted by level via `.message-<level>`; the base rule is the fallback for a
 * level we do not colour. */
.message {
	flex: 1 1 auto;
	min-width: 0;
	color: var(--text-color);
	white-space: pre-wrap;
	word-break: break-word;
}

.messageClamped {
	white-space: pre;
	overflow: hidden;
	text-overflow: ellipsis;
}

.execution {
	flex-shrink: 0;
	color: var(--text-color--info);
}

.truncated {
	flex-shrink: 0;
	color: var(--icon-color--warning);
}

.detail {
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
