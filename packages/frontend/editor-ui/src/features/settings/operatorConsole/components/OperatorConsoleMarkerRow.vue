<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import type { OperatorConsoleMarkerEntry } from '../operatorConsole.types';

const props = defineProps<{ entry: OperatorConsoleMarkerEntry }>();

const i18n = useI18n();

const icon = computed<IconName>(() => {
	switch (props.entry.marker) {
		case 'dropped':
			return 'triangle-alert';
		case 'gap':
		case 'trimmed':
			return 'scissors';
		default:
			return 'history';
	}
});

const tone = computed(() => (props.entry.marker === 'dropped' ? 'warning' : 'neutral'));

const label = computed(() => {
	const count = props.entry.count ?? 0;

	switch (props.entry.marker) {
		case 'dropped':
			return props.entry.hostId
				? i18n.baseText('operatorConsole.marker.dropped', {
						interpolate: { count, hostId: props.entry.hostId },
					})
				: i18n.baseText('operatorConsole.marker.droppedWhilePaused', {
						interpolate: { count },
					});
		case 'gap':
			return i18n.baseText('operatorConsole.marker.gap');
		case 'trimmed':
			return i18n.baseText('operatorConsole.marker.trimmed', { interpolate: { count } });
		case 'historyStart':
			return i18n.baseText('operatorConsole.marker.historyStart');
		case 'historyEnd':
			return i18n.baseText('operatorConsole.marker.historyEnd');
	}
	return '';
});
</script>

<template>
	<div
		:class="[$style.marker, tone === 'warning' ? $style.warning : $style.neutral]"
		:data-test-id="`operator-console-marker-${entry.marker}`"
		role="note"
	>
		<N8nIcon :icon="icon" size="xsmall" />
		<N8nText size="xsmall" :compact="true">{{ label }}</N8nText>
	</div>
</template>

<style module lang="scss">
.marker {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-block: var(--border);
	box-sizing: border-box;
}

.neutral {
	color: var(--text-color--subtler);
	background-color: var(--background--subtle);
}

.warning {
	color: var(--text-color--warning);
	background-color: var(--background--warning);
	border-block-color: var(--border-color--warning);
}
</style>
