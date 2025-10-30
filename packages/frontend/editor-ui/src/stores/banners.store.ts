import type { Component } from 'vue';
import { computed, markRaw, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@/stores/settings.store';
import type { DynamicBanner } from '@n8n/rest-api-client/api/dynamic-banners';
import { getDynamicBanners } from '@n8n/rest-api-client/api/dynamic-banners';
import type { BannerName } from '@n8n/api-types';
import DynamicBannerComponent from '@/features/shared/banners/components/banners/DynamicBanner.vue';
import { dismissBannerPermanently } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

export const useBannersStore = defineStore(STORES.BANNERS, () => {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();

	// Dynamic banners fetched from API
	const dynamicBanners = ref<DynamicBanner[]>([]);

	// Banner stack for all banners (both static and dynamic)
	const bannerStack = ref<BannerName[]>([]);

	// Height of the banner area
	const bannersHeight = ref<number>(0);

	const mapDeploymentTypeValue = (deploymentType: string) => {
		return deploymentType === 'cloud' ? 'cloud' : 'self-hosted';
	};

	async function fetchDynamicBanners() {
		if (
			!settingsStore.settings.dynamicBanners.endpoint ||
			!settingsStore.settings.dynamicBanners.enabled
		) {
			return [];
		}
		const version = settingsStore.settings.versionCli;
		const deploymentType = mapDeploymentTypeValue(
			settingsStore.settings.deployment?.type ?? 'default',
		);

		try {
			dynamicBanners.value = (
				await getDynamicBanners(
					settingsStore.settings.dynamicBanners.endpoint,
					version,
					deploymentType,
				)
			).map((item) => ({
				...item,
				id: `dynamic-banner-${item.id}`,
				component: markRaw(DynamicBannerComponent as Component),
			}));
			return dynamicBanners.value;
		} catch (e) {
			console.error('Failed to fetch dynamic banners:', e);
			return [];
		}
	}

	const dynamicBannersMap = computed(() => {
		return dynamicBanners.value.reduce(
			(acc, item) => {
				acc[item.id] = item;
				return acc;
			},
			{} as Record<BannerName, DynamicBanner>,
		);
	});

	const removeBannerFromStack = (name: BannerName) => {
		bannerStack.value = bannerStack.value.filter((bannerName) => bannerName !== name);
	};

	const dismissBanner = async (name: BannerName, type: 'temporary' | 'permanent' = 'temporary') => {
		if (type === 'permanent') {
			await dismissBannerPermanently(rootStore.restApiContext, {
				bannerName: name,
				dismissedBanners: settingsStore.permanentlyDismissedBanners,
			});
			removeBannerFromStack(name);
			return;
		}
		removeBannerFromStack(name);
	};

	const updateBannersHeight = (newHeight: number) => {
		bannersHeight.value = newHeight;
	};

	const pushBannerToStack = (name: BannerName) => {
		if (bannerStack.value.includes(name)) return;
		bannerStack.value.push(name);
	};

	const clearBannerStack = () => {
		bannerStack.value = [];
	};

	const initialize = (options: { banners: BannerName[] }) => {
		options.banners.forEach(pushBannerToStack);
		void fetchDynamicBanners().then((banners) => {
			banners
				?.filter((banner) => !settingsStore.permanentlyDismissedBanners.includes(banner.id))
				.forEach((banner) => pushBannerToStack(banner.id));
		});
	};

	return {
		// State
		dynamicBanners,
		bannerStack,
		bannersHeight,

		// Computed
		dynamicBannersMap,

		// Actions
		dismissBanner,
		updateBannersHeight,
		pushBannerToStack,
		clearBannerStack,
		initialize,
	};
});
