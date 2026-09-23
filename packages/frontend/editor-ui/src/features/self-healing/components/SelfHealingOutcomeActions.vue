<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

import { useSelfHealingStore } from '../selfHealing.store';

/**
 * The next step for the two inbox kinds that are not reviews, shown under
 * their description. The Review button stays in the tab row for every kind.
 */
const props = defineProps<{
	reviewId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const store = useSelfHealingStore();

const outcome = computed(() => store.getOutcome(props.reviewId));

async function onOpenCredential() {
	await router.push({ name: VIEWS.CREDENTIALS });
}

async function onContinueInChat() {
	await router.push({ name: INSTANCE_AI_VIEW });
}
</script>

<template>
	<div v-if="outcome" :class="$style.actions" data-test-id="self-healing-outcome-actions">
		<N8nButton
			v-if="outcome.action?.type === 'open_credential'"
			variant="outline"
			size="small"
			icon="key-round"
			:label="i18n.baseText('selfHealing.outcome.action.openCredential')"
			data-test-id="self-healing-outcome-open-credential"
			@click="onOpenCredential"
		/>
		<N8nButton
			v-else
			variant="outline"
			size="small"
			icon="message-circle"
			:label="i18n.baseText('selfHealing.outcome.action.continueInChat')"
			data-test-id="self-healing-outcome-continue-in-chat"
			@click="onContinueInChat"
		/>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
