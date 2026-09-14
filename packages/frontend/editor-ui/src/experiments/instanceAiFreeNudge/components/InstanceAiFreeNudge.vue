<script lang="ts" setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { N8nIconButton, N8nStatusDot, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useInstanceAiFreeNudgeStore } from '../stores/instanceAiFreeNudge.store';

const props = defineProps<{
	eligible: boolean;
}>();

const i18n = useI18n();
const store = useInstanceAiFreeNudgeStore();
const { shouldShowNudge, shouldTrackExposure, treatmentVariant } = storeToRefs(store);

const copyKey = computed<BaseTextKey>(() =>
	treatmentVariant.value === 'variant-2'
		? 'experiments.instanceAiFreeNudge.variant2'
		: 'experiments.instanceAiFreeNudge.variant1',
);

let hasTrackedExposure = false;
watch(
	() => props.eligible && shouldTrackExposure.value,
	(shouldTrack) => {
		if (!shouldTrack || hasTrackedExposure) return;

		hasTrackedExposure = true;
		store.trackExposure();
	},
	{ immediate: true },
);
</script>

<template>
	<div
		v-if="props.eligible && shouldShowNudge"
		:class="$style.pill"
		data-test-id="instance-ai-free-nudge"
	>
		<N8nStatusDot variant="success" />
		<N8nText size="small" :class="$style.copy">{{ i18n.baseText(copyKey) }}</N8nText>
		<N8nIconButton
			icon="x"
			variant="ghost"
			size="xsmall"
			:aria-label="i18n.baseText('generic.dismiss')"
			:class="$style.dismiss"
			style="--button--radius: var(--radius--full)"
			data-test-id="instance-ai-free-nudge-dismiss"
			@click="store.dismiss"
		/>
	</div>
</template>

<style lang="scss" module>
.pill {
	display: inline-flex;
	align-self: center;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs);
	padding-left: var(--spacing--2xs);
	background: var(--background--success);
	border: 1px solid var(--border-color--success);
	border-radius: var(--radius--full);
	white-space: nowrap;
}

.copy {
	color: var(--text-color--success);
}

.dismiss {
	--button--color: var(--icon-color--success);
	--button--color--background-hover: color-mix(
		in srgb,
		var(--background--success),
		var(--text-color--success) 10%
	);
	--button--color--background-active: color-mix(
		in srgb,
		var(--background--success),
		var(--text-color--success) 15%
	);
}
</style>
