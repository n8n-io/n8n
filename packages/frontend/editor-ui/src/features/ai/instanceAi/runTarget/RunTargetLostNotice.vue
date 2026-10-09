<script setup lang="ts">
/**
 * Tells the owner that the chat now runs here, because its linked instance is no longer linked.
 * The notice shows once: showing it acknowledges it, and the server then drops it.
 */
import { computed, watch } from 'vue';
import { N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiStore, useThread } from '../instanceAi.store';

import { useOpenThreadSummary } from './useOpenThreadSummary';

const i18n = useI18n();
const thread = useThread();
const store = useInstanceAiStore();
const summary = useOpenThreadSummary();
const lostLink = computed(() => summary.value?.lostRunTarget);

watch(
	() => lostLink.value?.name,
	(name) => {
		if (name) void store.acknowledgeLostRunTarget(thread.id);
	},
	{ immediate: true },
);
</script>

<template>
	<!-- A status message: a screen reader announces it when the chat shows it. -->
	<N8nNotice
		v-if="lostLink"
		theme="warning"
		role="status"
		:class="$style.notice"
		data-test-id="instance-ai-run-target-lost-notice"
	>
		{{ i18n.baseText('instanceAi.runTarget.lostLink', { interpolate: { name: lostLink.name } }) }}
	</N8nNotice>
</template>

<style lang="scss" module>
// The composer column has its own padding, so the notice needs no outer space of its own.
.notice {
	--notice--margin: 0;
}
</style>
