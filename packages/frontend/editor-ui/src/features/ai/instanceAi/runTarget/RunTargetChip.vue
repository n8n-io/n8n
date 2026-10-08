<script setup lang="ts">
/** "Runs in {name}" next to the chat title, when the chat runs on another instance. */
import { computed } from 'vue';
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiStore, useThread } from '../instanceAi.store';

import { runTargetChipName } from './runTargetOptions';

const thread = useThread();
const store = useInstanceAiStore();
const i18n = useI18n();

const summary = computed(
	() =>
		store.threads.find(({ id }) => id === thread.id) ??
		store.threadHistory.threads.find(({ id }) => id === thread.id),
);

const name = computed(() =>
	runTargetChipName(summary.value?.runTarget, summary.value?.sharedWith !== undefined),
);
</script>

<template>
	<N8nTooltip v-if="name" placement="bottom" as-child>
		<template #content>{{ i18n.baseText('instanceAi.runTarget.chip.tooltip') }}</template>
		<span :class="$style.chip" data-test-id="instance-ai-run-target-chip">
			<N8nBadge variant="outline" leading-icon="cloud" :class="$style.badge">
				{{ i18n.baseText('instanceAi.runTarget.chip', { interpolate: { name } }) }}
			</N8nBadge>
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	min-width: 0;
	max-width: 50%;
	flex-shrink: 2;
}

.badge {
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
