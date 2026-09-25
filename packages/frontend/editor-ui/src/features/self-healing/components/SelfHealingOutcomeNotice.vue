<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useSelfHealingStore } from '../selfHealing.store';
import SelfHealingOutcomeActions from './SelfHealingOutcomeActions.vue';

/**
 * Leads the description of an "Action needed" or "Could not fix" item, so the
 * missing fix is the first thing the reader sees and is not mistaken for a
 * pending review. It holds the next step too, so the reason and the way
 * forward sit together.
 */
const props = defineProps<{
	reviewId: string;
}>();

const i18n = useI18n();
const store = useSelfHealingStore();

const outcome = computed(() => store.getOutcome(props.reviewId));
</script>

<template>
	<N8nCallout
		v-if="outcome"
		theme="warning"
		:class="$style.notice"
		data-test-id="self-healing-outcome-notice"
	>
		<strong>{{ i18n.baseText(`selfHealing.outcome.notice.${outcome.kind}`) }}</strong>
		<template v-if="outcome.reason">{{ ` ${outcome.reason}` }}</template>
		<template #trailingContent>
			<SelfHealingOutcomeActions :review-id="reviewId" />
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.notice {
	gap: var(--spacing--sm);
	margin: var(--spacing--3xs) 0 var(--spacing--2xs);

	// The callout sets its message in small text; the notice reads at the same
	// size as the description under it.
	:global(.n8n-text) {
		font-size: var(--font-size--sm);
	}
}
</style>
