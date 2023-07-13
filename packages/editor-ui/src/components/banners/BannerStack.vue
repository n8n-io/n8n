<script setup lang="ts">
import TrialOverBanner from '@/components/banners/TrialOverBanner.vue';
import TrialBanner from '@/components/banners/TrialBanner.vue';
import V1Banner from '@/components/banners/V1Banner.vue';
import { useUIStore } from '@/stores/ui.store';
import { BANNERS } from '@/constants';
import { onMounted, watch } from 'vue';
import { getBannerRowHeight } from '@/utils';

const uiStore = useUIStore();

function shouldShowBanner(bannerName: BANNERS) {
	return uiStore.banners[bannerName].dismissed === false;
}

async function updateCurrentBannerHeight() {
	const bannerHeight = await getBannerRowHeight();
	uiStore.updateBannersHeight(bannerHeight);
}

onMounted(async () => {
	await updateCurrentBannerHeight();
});

watch(uiStore.banners, async () => {
	await updateCurrentBannerHeight();
});
</script>

<template>
	<div data-test-id="banner-stack">
		<trial-over-banner v-if="shouldShowBanner(BANNERS.TRIAL_OVER)" />
		<trial-banner v-if="shouldShowBanner(BANNERS.TRIAL)" />
		<v1-banner v-if="shouldShowBanner(BANNERS.V1)" />
	</div>
</template>
