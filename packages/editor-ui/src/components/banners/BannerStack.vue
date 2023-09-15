<script lang="ts">
import NonProductionLicenseBanner from '@/components/banners/NonProductionLicenseBanner.vue';
import TrialOverBanner from '@/components/banners/TrialOverBanner.vue';
import TrialBanner from '@/components/banners/TrialBanner.vue';
import V1Banner from '@/components/banners/V1Banner.vue';
import EmailConfirmationBanner from '@/components/banners/EmailConfirmationBanner.vue';
import type { Component } from 'vue';
import type { N8nBanners } from '@/Interface';

// All banners that can be shown in the banner stack should be registered here.
// All banners that should be shown at the same time are placed on banner stack in UI store
// and this component will render the banner with the highest priority from the stack
// When registering a new banner, please consult this document to determine it's priority:
// https://www.notion.so/n8n/Banner-stack-60948c4167c743718fde80d6745258d5
export const N8N_BANNERS: N8nBanners = {
	V1: { priority: 350, component: V1Banner as Component },
	TRIAL_OVER: { priority: 260, component: TrialOverBanner as Component },
	EMAIL_CONFIRMATION: { priority: 250, component: EmailConfirmationBanner as Component },
	TRIAL: { priority: 150, component: TrialBanner as Component },
	NON_PRODUCTION_LICENSE: { priority: 140, component: NonProductionLicenseBanner as Component },
};
</script>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';
import { computed, onMounted } from 'vue';
import { getBannerRowHeight } from '@/utils';

const uiStore = useUIStore();

async function updateCurrentBannerHeight() {
	const bannerHeight = await getBannerRowHeight();
	uiStore.updateBannersHeight(bannerHeight);
}

const currentlyShownBanner = computed(() => {
	void updateCurrentBannerHeight();
	return uiStore.bannerStack.length > 0 ? N8N_BANNERS[uiStore.bannerStack[0]].component : null;
});

onMounted(async () => {
	await updateCurrentBannerHeight();
});
</script>

<template>
	<div data-test-id="banner-stack">
		<component :is="currentlyShownBanner" />
	</div>
</template>
