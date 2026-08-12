<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRoute } from 'vue-router';

import InstanceAiOfferBubble from './InstanceAiOfferBubble.vue';
import { useInstanceAiProactiveOffer } from '../composables/useInstanceAiProactiveOffer';
import { INSTANCE_AI_DEMO_OFFER_QUERY } from '../constants';
import type { ProactiveOffer } from '../instanceAiPanel.types';

const i18n = useI18n();
const route = useRoute();
const { activeOffer, raise, accept, dismiss } = useInstanceAiProactiveOffer();

const demoOffer = computed<ProactiveOffer>(() => ({
	key: 'demo:hardcoded',
	title: i18n.baseText('instanceAi.proactiveOffer.demo.title'),
	detail: i18n.baseText('instanceAi.proactiveOffer.demo.detail'),
	message: i18n.baseText('instanceAi.proactiveOffer.demo.message'),
	source: 'proactive_offer',
}));

watch(
	() => route.query[INSTANCE_AI_DEMO_OFFER_QUERY],
	(value) => {
		if (value === '1' || value === 'true') {
			raise(demoOffer.value);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<InstanceAiOfferBubble
		v-if="activeOffer"
		:title="activeOffer.title"
		:detail="activeOffer.detail"
		@accept="accept"
		@dismiss="dismiss"
	/>
</template>
