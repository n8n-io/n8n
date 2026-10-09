<script setup lang="ts">
/** "Runs in {name}" next to the chat title, when the chat runs on another instance. */
import { computed } from 'vue';
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { LINKED_INSTANCES_MODULE_ID } from '@/features/linkedInstances/linkedInstances.constants';

import { useOpenThreadSummary } from './useOpenThreadSummary';
import { runTargetChipName } from './runTargetOptions';

const settingsStore = useSettingsStore();
const i18n = useI18n();
const summary = useOpenThreadSummary();

// With the module off the chat still stores its link, but it runs here, so the chip stays hidden.
const name = computed(() =>
	settingsStore.isModuleActive(LINKED_INSTANCES_MODULE_ID) === true
		? runTargetChipName(summary.value?.runTarget, summary.value?.sharedWith !== undefined)
		: undefined,
);

// The tooltip shows on focus, and the hidden copy gives screen readers the same explanation.
const explanation = computed(() => i18n.baseText('instanceAi.runTarget.chip.tooltip'));
</script>

<template>
	<N8nTooltip v-if="name" placement="bottom" as-child>
		<template #content>{{ explanation }}</template>
		<span :class="$style.chip" tabindex="0" data-test-id="instance-ai-run-target-chip">
			<N8nBadge variant="outline" leading-icon="cloud" :class="$style.badge">
				{{ i18n.baseText('instanceAi.runTarget.chip', { interpolate: { name } }) }}
			</N8nBadge>
			<span :class="$style.explanation">{{ explanation }}</span>
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

.explanation {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
