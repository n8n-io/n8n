<script lang="ts">
import type { BannerName } from '@n8n/api-types';
import { useBannersStore } from '@/stores/banners.store';
import NonProductionLicenseBanner from './banners/NonProductionLicenseBanner.vue';
import TrialOverBanner from './banners/TrialOverBanner.vue';
import TrialBanner from './banners/TrialBanner.vue';
import V1Banner from './banners/V1Banner.vue';
import EmailConfirmationBanner from './banners/EmailConfirmationBanner.vue';
import DataTableStorageLimitWarningBanner from './banners/DataTableStorageLimitWarningBanner.vue';
import DataTableStorageLimitErrorBanner from './banners/DataTableStorageLimitErrorBanner.vue';
import type { Component } from 'vue';
import type { N8nBanners } from '../banners.types';

// All banners that can be shown in the app should be registered here.
// This component renders the banner with the highest priority from the banner stack, located in the banners store.
// When registering a new banner, please consult this document to determine it's priority:
// https://www.notion.so/n8n/Banner-stack-60948c4167c743718fde80d6745258d5
export const N8N_BANNERS: N8nBanners = {
	V1: { priority: 350, component: V1Banner as Component },
	TRIAL_OVER: { priority: 260, component: TrialOverBanner as Component },
	EMAIL_CONFIRMATION: { priority: 250, component: EmailConfirmationBanner as Component },
	TRIAL: { priority: 150, component: TrialBanner as Component },
	NON_PRODUCTION_LICENSE: { priority: 140, component: NonProductionLicenseBanner as Component },
	DATA_TABLE_STORAGE_LIMIT_WARNING: {
		priority: 300,
		component: DataTableStorageLimitWarningBanner as Component,
	},
	DATA_TABLE_STORAGE_LIMIT_ERROR: {
		priority: 400,
		component: DataTableStorageLimitErrorBanner as Component,
	},
};
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { getBannerRowHeight } from '@/utils/htmlUtils';

const bannersStore = useBannersStore();

async function updateCurrentBannerHeight() {
	const bannerHeight = await getBannerRowHeight();
	bannersStore.updateBannersHeight(bannerHeight);
}

const getBannerForName = (bannerName: BannerName) => {
	return N8N_BANNERS[bannerName] || bannersStore.dynamicBannersMap[bannerName];
};

const currentlyShownBanner = computed(() => {
	void updateCurrentBannerHeight();
	if (bannersStore.bannerStack.length === 0) return null;
	// Find the banner with the highest priority
	let currentBanner = getBannerForName(bannersStore.bannerStack[0]);
	let currentBannerName = bannersStore.bannerStack[0];
	bannersStore.bannerStack.forEach((bannerName, index) => {
		if (index === 0) return;
		const bannerToCompare = getBannerForName(bannerName);
		if (bannerToCompare.priority > currentBanner.priority) {
			currentBanner = bannerToCompare;
			currentBannerName = bannerName;
		}
	});

	return {
		component: currentBanner.component,
		props: {
			name: currentBannerName,
			content: currentBanner.content,
			theme: currentBanner.theme,
			isDismissible: currentBanner.isDismissible,
			dismissPermanently: currentBanner.dismissPermanently,
		},
	};
});

onMounted(async () => {
	await updateCurrentBannerHeight();
});
</script>

<template>
	<div data-test-id="banner-stack">
		<component
			:is="currentlyShownBanner.component"
			v-if="currentlyShownBanner"
			v-bind="currentlyShownBanner.props"
		/>
	</div>
</template>
