<script lang="ts" setup>
import type { PromotionRunState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		state: PromotionRunState;
		decorative?: boolean;
	}>(),
	{ decorative: false },
);

const i18n = useI18n();

const label = computed(() => i18n.baseText(`promotionReviews.state.${props.state}`));
</script>

<template>
	<div
		:class="[$style.dot, $style[state]]"
		data-test-id="promotion-review-state-dot"
		v-bind="decorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': label }"
	/>
</template>

<style module lang="scss">
.dot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.open {
	background-color: var(--color--blue-500);
}

.merged {
	background-color: var(--color--green-500);
}

.closed,
.unavailable {
	background-color: var(--color--neutral-500);
}
</style>
