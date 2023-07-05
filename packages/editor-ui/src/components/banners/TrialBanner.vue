<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { BANNERS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { computed } from 'vue';

const trialDaysLeft = computed(() => {
	const { trialDaysLeft } = useCloudPlanStore();
	return trialDaysLeft;
});

function onUpdatePlanClick() {
	window.location.href = '/account/change-plan';
}

function messageText() {
	if (trialDaysLeft.value === 1) {
		return locale.baseText('banners.trial.oneDayLeft');
	}
	return locale.baseText('banners.trial.message', {
		interpolate: { daysLeft: String(-1 * trialDaysLeft.value) },
	});
}
</script>

<template>
	<base-banner :name="BANNERS.TRIAL">
		<template #mainContent>
			<span>{{ messageText() }}</span>
		</template>
		<template #trailingContent>
			<n8n-button type="success" @click="onUpdatePlanClick" icon="gem">{{
				locale.baseText('generic.upgradeNow')
			}}</n8n-button>
		</template>
	</base-banner>
</template>
