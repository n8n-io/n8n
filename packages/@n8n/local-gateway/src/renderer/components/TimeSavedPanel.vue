<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatMinutesSaved } from '../../shared/history-format';

const props = defineProps<{
	weekMinutes: number | null;
	monthMinutes: number | null;
}>();

const i18n = useI18n();

/**
 * Columns for the figures we have. A `null` figure (its insights call was
 * unavailable — e.g. the month range is license-capped) is omitted; a real `0`
 * stays and renders as a dash via `formatMinutesSaved`.
 */
const columns = computed(() => {
	const result: Array<{ label: string; value: string }> = [];
	if (props.weekMinutes !== null) {
		result.push({
			label: i18n.baseText('desktopAssistant.history.timeSaved.thisWeek'),
			value: formatMinutesSaved(props.weekMinutes),
		});
	}
	if (props.monthMinutes !== null) {
		result.push({
			label: i18n.baseText('desktopAssistant.history.timeSaved.thisMonth'),
			value: formatMinutesSaved(props.monthMinutes),
		});
	}
	return result;
});
</script>

<template>
	<div :class="$style.panel">
		<span :class="$style.caption">
			<N8nIcon icon="clock" size="small" />
			<N8nText :class="$style.captionText">{{
				i18n.baseText('desktopAssistant.history.timeSaved.title')
			}}</N8nText>
		</span>
		<div :class="$style.figures">
			<div v-for="col in columns" :key="col.label" :class="$style.figure">
				<N8nText bold :class="$style.value">{{ col.value }}</N8nText>
				<N8nText size="small" :class="$style.label">{{ col.label }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 4px 6px 8px;
	padding: 12px 14px;
	border: 1px solid var(--da-border);
	border-radius: var(--da-radius);
	background: var(--da-surface);
}

.caption {
	display: flex;
	align-items: center;
	gap: 5px;
	color: var(--da-subtlest);
}

/* Scoped under `.caption` so font-size/weight win over N8nText's own classes. */
.caption .captionText {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.8px;
	color: var(--da-subtlest);
}

.figures {
	display: flex;
	align-items: stretch;
}

/* Figure = green duration with its period label inline to the right; a divider
   sits between figures when both are shown (only the 2nd figure gets a border). */
.figure {
	display: flex;
	flex: 1;
	align-items: baseline;
	gap: 7px;
	padding: 2px 16px;
}

.figure:first-child {
	padding-left: 2px;
}

.figure + .figure {
	border-left: 1px solid var(--da-border);
}

.figure .value {
	font-size: 22px;
	line-height: 1.15;
	color: var(--da-green);
}

.label {
	color: var(--da-subtler);
}
</style>
