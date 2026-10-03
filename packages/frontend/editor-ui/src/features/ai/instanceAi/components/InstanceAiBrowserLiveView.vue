<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useThread } from '../instanceAi.store';

const thread = useThread();
const i18n = useI18n();
</script>

<template>
	<div v-if="thread.browserLiveViewUrl" :class="$style.liveView" data-test-id="browser-live-view">
		<div :class="$style.header">{{ i18n.baseText('instanceAi.browserLiveView.title') }}</div>
		<iframe
			:src="thread.browserLiveViewUrl"
			:class="$style.frame"
			:title="i18n.baseText('instanceAi.browserLiveView.title')"
			sandbox="allow-same-origin allow-scripts"
			allow="clipboard-read; clipboard-write"
		/>
	</div>
</template>

<style lang="scss" module>
.liveView {
	margin: var(--spacing--xs) 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.header {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
	border-bottom: var(--border);
}

.frame {
	display: block;
	width: 100%;
	aspect-ratio: 16 / 10;
	border: 0;
}
</style>
