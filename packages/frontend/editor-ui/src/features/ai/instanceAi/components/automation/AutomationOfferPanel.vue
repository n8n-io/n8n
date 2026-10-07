<script setup lang="ts">
/**
 * Offer to make a workflow automatic after it ran successfully in the thread.
 * The parent decides when to show it; this component only shows the copy and
 * reports the choice.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { LIVE_REGION_ANNOUNCE_DELAY } from '@/app/constants/durations';

const props = defineProps<{
	workflowName: string;
}>();

defineEmits<{
	accept: [];
	dismiss: [];
}>();

const i18n = useI18n();
const titleId = useId();

// The offer appears below the transcript after the turn. Announce it politely,
// so screen reader users know about it, and leave the focus where it is.
const isAnnounced = ref(false);
let announceTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
	announceTimer = setTimeout(() => (isAnnounced.value = true), LIVE_REGION_ANNOUNCE_DELAY);
});
onBeforeUnmount(() => clearTimeout(announceTimer));

const announcement = computed(() =>
	isAnnounced.value
		? i18n.baseText('instanceAi.automationOffer.announcement', {
				interpolate: { name: props.workflowName },
			})
		: '',
);
</script>

<template>
	<div
		:class="$style.root"
		role="region"
		:aria-labelledby="titleId"
		data-test-id="automation-offer-panel"
	>
		<!-- Not N8nVisuallyHidden: it sets aria-hidden, which also hides a live region. -->
		<span :class="$style.announcement" role="status" data-test-id="automation-offer-announcement">{{
			announcement
		}}</span>
		<div :class="$style.head">
			<span :class="$style.iconWrap" aria-hidden="true">
				<N8nIcon icon="zap" size="medium" />
			</span>
			<N8nText :id="titleId" bold color="text-dark" :class="$style.title">
				{{ i18n.baseText('instanceAi.automationOffer.title') }}
			</N8nText>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="xsmall"
				:aria-label="i18n.baseText('instanceAi.automationOffer.dismiss')"
				:title="i18n.baseText('instanceAi.automationOffer.dismiss')"
				data-test-id="automation-offer-dismiss"
				@click="$emit('dismiss')"
			/>
		</div>
		<!-- `step` rather than `size`: the `size` scale skips `--font-size--xs`. -->
		<N8nText step="xs" color="text-base" :class="$style.body">
			{{
				i18n.baseText('instanceAi.automationOffer.body', { interpolate: { name: workflowName } })
			}}
		</N8nText>
		<N8nButton
			variant="solid"
			size="small"
			data-test-id="automation-offer-accept"
			@click="$emit('accept')"
		>
			{{ i18n.baseText('instanceAi.automationOffer.accept') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
/* Same flat card as the "test your agent" offer, so the offers match in the thread. */
.root {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	margin: var(--spacing--2xs) 0;
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.head {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	align-self: stretch;
}

.iconWrap {
	display: flex;
	padding: var(--spacing--3xs);
	background-color: var(--background--subtle);
	border-radius: var(--radius--2xs);
}

.title {
	flex: 1;
	min-width: 0;
}

.body {
	overflow-wrap: anywhere;
}

/* Hidden on screen, read by screen readers. */
.announcement {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
