<script setup lang="ts">
/**
 * Tells the owner that the chat now runs here, because its linked instance is no longer linked.
 * The server keeps the notice until the owner dismisses it, so a later read of the chat does
 * not hide it before the owner has seen it.
 */
import { computed } from 'vue';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiStore, useThread } from '../instanceAi.store';

import { useOpenThreadSummary } from './useOpenThreadSummary';

const emit = defineEmits<{ dismissed: [] }>();

const i18n = useI18n();
const thread = useThread();
const store = useInstanceAiStore();
const summary = useOpenThreadSummary();
const lostLink = computed(() => summary.value?.lostRunTarget);

function dismiss() {
	void store.acknowledgeLostRunTarget(thread.id);
	// The button goes with the notice, so the parent moves the focus on.
	emit('dismissed');
}
</script>

<template>
	<!-- A status message: a screen reader announces it when the chat shows it. -->
	<N8nCallout
		v-if="lostLink"
		theme="warning"
		slim
		role="status"
		data-test-id="instance-ai-run-target-lost-notice"
	>
		{{ i18n.baseText('instanceAi.runTarget.lostLink', { interpolate: { name: lostLink.name } }) }}
		<template #trailingContent>
			<N8nButton
				variant="ghost"
				size="xsmall"
				:class="$style.dismiss"
				data-test-id="instance-ai-run-target-lost-notice-dismiss"
				@click="dismiss"
			>
				{{ i18n.baseText('instanceAi.runTarget.lostLink.dismiss') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
// Keeps the button apart from a message that wraps.
.dismiss {
	flex-shrink: 0;
	margin-inline-start: var(--spacing--2xs);
}
</style>
