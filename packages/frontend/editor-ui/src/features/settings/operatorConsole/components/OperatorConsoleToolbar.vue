<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

import type { OperatorConsoleConnectionState } from '../operatorConsole.types';

const props = defineProps<{
	connectionState: OperatorConsoleConnectionState;
	isPaused: boolean;
	followTail: boolean;
	recordCount: number;
	droppedTotal: number;
	pausedLineCount: number;
	canDownload: boolean;
}>();

const emit = defineEmits<{
	'toggle-pause': [];
	'toggle-follow': [];
	download: [];
	clear: [];
}>();

const i18n = useI18n();

const statusLabel = computed(() => {
	if (props.isPaused) return i18n.baseText('operatorConsole.status.paused');
	return i18n.baseText(`operatorConsole.status.${props.connectionState}`);
});

const statusTone = computed(() => {
	if (props.connectionState === 'error') return 'error';
	if (props.isPaused || props.connectionState !== 'streaming') return 'idle';
	return 'live';
});
</script>

<template>
	<div :class="$style.toolbar" data-test-id="operator-console-toolbar">
		<span :class="[$style.status, $style[statusTone]]" data-test-id="operator-console-status">
			<span :class="$style.dot" aria-hidden="true"></span>
			<N8nText size="xsmall" :compact="true">{{ statusLabel }}</N8nText>
		</span>

		<N8nText size="xsmall" color="text-light" :compact="true">
			{{
				i18n.baseText('operatorConsole.toolbar.lineCount', { interpolate: { count: recordCount } })
			}}
		</N8nText>

		<N8nText
			v-if="droppedTotal > 0"
			size="xsmall"
			:compact="true"
			:class="$style.dropped"
			data-test-id="operator-console-dropped-total"
		>
			{{
				i18n.baseText('operatorConsole.toolbar.droppedCount', {
					interpolate: { count: droppedTotal },
				})
			}}
		</N8nText>

		<N8nText
			v-if="isPaused"
			size="xsmall"
			color="text-light"
			:compact="true"
			data-test-id="operator-console-paused-count"
		>
			{{
				i18n.baseText('operatorConsole.toolbar.pausedCount', {
					interpolate: { count: pausedLineCount },
				})
			}}
		</N8nText>

		<span :class="$style.spacer"></span>

		<N8nTooltip :content="i18n.baseText('operatorConsole.toolbar.follow')">
			<N8nButton
				:variant="followTail ? 'outline' : 'ghost'"
				size="small"
				:aria-pressed="followTail"
				data-test-id="operator-console-follow-toggle"
				@click="emit('toggle-follow')"
			>
				<template #icon><N8nIcon icon="arrow-down" size="xsmall" /></template>
				{{ i18n.baseText('operatorConsole.toolbar.follow') }}
			</N8nButton>
		</N8nTooltip>

		<N8nButton
			variant="ghost"
			size="small"
			data-test-id="operator-console-pause-toggle"
			@click="emit('toggle-pause')"
		>
			<template #icon><N8nIcon :icon="isPaused ? 'play' : 'pause'" size="xsmall" /></template>
			{{
				isPaused
					? i18n.baseText('operatorConsole.toolbar.resume')
					: i18n.baseText('operatorConsole.toolbar.pause')
			}}
		</N8nButton>

		<N8nButton
			variant="ghost"
			size="small"
			:disabled="!canDownload"
			data-test-id="operator-console-download"
			@click="emit('download')"
		>
			<template #icon><N8nIcon icon="download" size="xsmall" /></template>
			{{ i18n.baseText('operatorConsole.toolbar.download') }}
		</N8nButton>

		<N8nButton
			variant="ghost"
			size="small"
			data-test-id="operator-console-clear"
			@click="emit('clear')"
		>
			<template #icon><N8nIcon icon="trash-2" size="xsmall" /></template>
			{{ i18n.baseText('operatorConsole.toolbar.clear') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-bottom: var(--border);
	background-color: var(--background--surface);
}

.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: currentColor;
}

.live {
	color: var(--text-color--success);
}

.idle {
	color: var(--text-color--subtler);
}

.error {
	color: var(--text-color--danger);
}

.dropped {
	color: var(--text-color--warning);
}

.spacer {
	flex: 1 1 auto;
}
</style>
