<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const pageRedirectionHelper = usePageRedirectionHelper();
const i18n = useI18n();

const goToUpgrade = async () => {
	await pageRedirectionHelper.goToUpgrade('insights', 'upgrade-insights');
};
</script>

<template>
	<n8n-action-box
		data-test-id="evaluations-unlicensed"
		heading="Register to enable evaluation"
		description="Register your Community instance to unlock the evaluation feature"
		button-text="Register instance"
		@click="goToUpgrade"
	></n8n-action-box>
</template>
