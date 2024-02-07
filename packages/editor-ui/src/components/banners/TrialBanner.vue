<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { computed } from 'vue';
import { useUIStore } from '@/stores/ui.store';

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
	void useUIStore().goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
}
</script>

<template>
	<BaseBanner name="TRIAL" theme="custom">
		<template #mainContent>
			<span>{{ messageText }}</span>
		</template>
		<template #trailingContent>
			<n8n-button type="success" icon="gem" size="small" @click="onUpdatePlanClick">{{
				locale.baseText('generic.upgradeNow')
			}}</n8n-button>
		</template>
	</BaseBanner>
</template>
