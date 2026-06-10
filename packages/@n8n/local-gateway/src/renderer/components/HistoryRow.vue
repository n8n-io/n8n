<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatRelativeTime, statusPresentation } from '../../shared/history-format';

import type { DesktopAssistantHistoryEntry } from '../../shared/types';

const props = defineProps<{
	entry: DesktopAssistantHistoryEntry;
	/** Epoch ms reference for the relative timestamp; supplied by the view so all rows agree. */
	now: number;
}>();

const emit = defineEmits<{ open: [workflowId: string, executionId: string] }>();

const i18n = useI18n();

const presentation = computed(() => statusPresentation(props.entry.status));
const isFailed = computed(() => presentation.value.kind === 'failed');
const relativeTime = computed(() =>
	formatRelativeTime(props.entry.startedAt ?? props.entry.createdAt, props.now),
);

function open() {
	emit('open', props.entry.workflowId, props.entry.id);
}
</script>

<template>
	<div
		:class="[$style.row, { [$style.callout]: isFailed }]"
		role="button"
		tabindex="0"
		:aria-label="
			i18n.baseText('desktopAssistant.history.openAriaLabel', {
				interpolate: { name: entry.workflowName },
			})
		"
		@click="open"
		@keydown.enter="open"
		@keydown.space.prevent="open"
	>
		<div :class="$style.header">
			<span :class="$style.status" :style="{ color: presentation.colorVar }">
				<N8nIcon :icon="presentation.icon" :spin="presentation.kind === 'running'" size="small" />
			</span>
			<N8nText bold :class="$style.name">{{ entry.workflowName }}</N8nText>
			<N8nText size="small" :class="$style.time">{{ relativeTime }}</N8nText>
		</div>

		<div v-if="isFailed" :class="$style.errorRow">
			<N8nText size="small" :class="$style.errorText">{{
				i18n.baseText('desktopAssistant.history.errorGeneric')
			}}</N8nText>
			<button type="button" :class="$style.fix" @click.stop="open">
				{{ i18n.baseText('desktopAssistant.history.fix') }}
			</button>
		</div>
	</div>
</template>

<style module>
.row {
	display: flex;
	flex-direction: column;
	gap: 5px;
	width: 100%;
	padding: 9px 6px;
	border: 1px solid transparent;
	background: transparent;
	text-align: left;
	cursor: pointer;
	font: inherit;
	color: var(--da-text);
	border-radius: var(--da-radius-sm);
	transition:
		background-color 0.12s,
		border-color 0.12s;
}

.row:not(.callout):hover {
	background: var(--da-surface-2);
}

/* Failed entries read as a bordered callout with a faint red wash. The
   horizontal padding matches the plain row (6px) so that — with the 1px border
   the plain row also reserves via its transparent border — the icon, name and
   time line up with the other rows instead of being inset by the border. */
.callout {
	margin: 3px 0;
	padding: 10px 6px;
	border-color: rgba(255, 107, 107, 0.28);
	background: rgba(255, 107, 107, 0.07);
	border-radius: var(--da-radius);
}

.callout:hover {
	background: rgba(255, 107, 107, 0.1);
}

.header {
	display: flex;
	align-items: center;
	gap: 10px;
}

.status {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 18px;
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--da-text);
}

.time {
	flex-shrink: 0;
	color: var(--da-subtlest);
}

/* Second callout line: generic error copy on the left, Fix on the right,
   indented to sit under the workflow name (past the status icon). */
.errorRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding-left: 28px;
}

.errorText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--da-red);
}

/* Fix pill: muted red surface, brighter on row hover. */
.fix {
	flex-shrink: 0;
	padding: 3px 11px;
	border: none;
	border-radius: 20px;
	font: inherit;
	font-size: 11px;
	font-weight: 600;
	color: var(--da-red);
	background: rgba(255, 107, 107, 0.16);
	cursor: pointer;
	transition: background-color 0.12s;
}

.callout:hover .fix {
	background: rgba(255, 107, 107, 0.26);
}
</style>
