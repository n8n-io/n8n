<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { i18n as locale } from '@n8n/i18n';

import { N8nButton } from '@n8n/design-system';
function onUpdatePlanClick() {
	void usePageRedirectionHelper().goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
}
</script>

<template>
	<BaseBanner custom-icon="info" theme="warning" name="TRIAL_OVER">
		<template #mainContent>
			<span>{{ locale.baseText('banners.trialOver.message') }}</span>
		</template>
		<template #trailingContent>
			<N8nButton type="success" icon="gem" size="small" @click="onUpdatePlanClick">{{
				locale.baseText('generic.upgradeNow')
			}}</N8nButton>
		</template>
	</BaseBanner>
</template>
