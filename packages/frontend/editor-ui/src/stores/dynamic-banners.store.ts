import type { Component } from 'vue';
import { computed, markRaw, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@/stores/settings.store';
import type { DynamicBanner } from '@n8n/rest-api-client/api/dynamic-banners';
import { getDynamicBanners } from '@n8n/rest-api-client/api/dynamic-banners';
import type { BannerName } from '@n8n/api-types';
import DynamicBannerComponent from '@/features/shared/banners/components/banners/DynamicBanner.vue';

export const useDynamicBannersStore = defineStore(STORES.DYNAMIC_BANNERS, () => {
	const settingsStore = useSettingsStore();

	const items = ref<DynamicBanner[]>([]);

	const mapDeploymentTypeValue = (deploymentType: string) => {
		return deploymentType === 'cloud' ? 'cloud' : 'self-hosted';
	};

	async function fetch() {
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
			items.value = (
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
			return items.value;
		} catch (e) {
			console.error('Failed to fetch dynamic banners:', e);
			return [];
		}
	}

	const itemsMap = computed(() => {
		return items.value.reduce(
			(acc, item) => {
				acc[item.id] = item;
				return acc;
			},
			{} as Record<BannerName, DynamicBanner>,
		);
	});

	return {
		items,
		itemsMap,
		fetch,
	};
});
