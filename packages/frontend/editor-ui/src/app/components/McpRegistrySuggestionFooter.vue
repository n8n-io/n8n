<script setup lang="ts">
import { computed } from 'vue';

import { SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';

import SuggestionFooter from './SuggestionFooter.vue';

defineProps<{
	prompt: string;
	action: string;
}>();

const posthogStore = usePostHog();
const suggestionUrl = computed(() => {
	const payload = posthogStore.getFeatureFlagPayload(SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY);
	return typeof payload === 'string' ? payload : undefined;
});
</script>

<template>
	<SuggestionFooter :prompt="prompt" :action="action" :url="suggestionUrl" />
</template>
