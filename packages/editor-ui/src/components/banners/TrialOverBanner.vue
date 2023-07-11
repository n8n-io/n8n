<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { BANNERS, CLOUD_UPDATE_PLAN_LINK } from '@/constants';

function onUpdatePlanClick() {
	window.location.href = CLOUD_UPDATE_PLAN_LINK;
}
</script>

<template>
	<base-banner customIcon="info-circle" theme="warning" :name="BANNERS.TRIAL_OVER">
		<template #mainContent>
			<span>{{ locale.baseText('banners.trialOver.message') }}</span>
		</template>
		<template #trailingContent>
			<n8n-button type="success" @click="onUpdatePlanClick" icon="gem" size="small">{{
				locale.baseText('generic.upgradeNow')
			}}</n8n-button>
		</template>
	</base-banner>
</template>
