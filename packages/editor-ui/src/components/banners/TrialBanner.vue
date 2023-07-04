<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { BANNERS } from '@/constants';

function messageText() {
	const daysLeft = 10;

	if (daysLeft === 1) {
		return locale.baseText('banners.trial.oneDayLeft');
	}
	return locale.baseText('banners.trial.message', { interpolate: { daysLeft } });
}
</script>

<template>
	<base-banner :name="BANNERS.TRIAL">
		<template #mainContent>
			<span>{{ messageText() }}</span>
		</template>
		<template #trailingContent>
			<n8n-button type="success" icon="gem">{{ locale.baseText('generic.upgradeNow') }}</n8n-button>
		</template>
	</base-banner>
</template>
