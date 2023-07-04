<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { BANNERS } from '@/constants';
</script>

<template>
	<base-banner customIcon="info-circle" theme="warning" :name="BANNERS.TRIAL_OVER">
		<template #mainContent>
			<span>{{ locale.baseText('banners.trialOver.message') }}</span>
		</template>
		<template #trailingContent>
			<n8n-button type="success" icon="gem">{{ locale.baseText('generic.upgradeNow') }}</n8n-button>
		</template>
	</base-banner>
</template>
