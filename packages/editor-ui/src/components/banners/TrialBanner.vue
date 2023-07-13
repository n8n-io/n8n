<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { BANNERS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { computed } from 'vue';
import { useUIStore } from '@/stores';

const trialDaysLeft = computed(() => {
	const { trialDaysLeft } = useCloudPlanStore();
	return -1 * trialDaysLeft;
});

const messageText = computed(() => {
	return locale.baseText('banners.trial.message', {
		adjustToNumber: trialDaysLeft.value,
		interpolate: { count: String(trialDaysLeft.value) },
	});
});

function onUpdatePlanClick() {
	useUIStore().goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
}
</script>

<template>
	<base-banner :name="BANNERS.TRIAL" theme="custom">
		<template #mainContent>
			<span>{{ messageText }}</span>
		</template>
		<template #trailingContent>
			<n8n-button type="success" @click="onUpdatePlanClick" icon="gem" size="small">{{
				locale.baseText('generic.upgradeNow')
			}}</n8n-button>
		</template>
	</base-banner>
</template>
