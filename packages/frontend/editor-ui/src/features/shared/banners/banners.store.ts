import type { Component } from 'vue';
import { computed, markRaw, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { DynamicBanner } from '@n8n/rest-api-client/api/dynamic-banners';
import { getDynamicBanners } from '@n8n/rest-api-client/api/dynamic-banners';
import type { BannerName } from '@n8n/api-types';
import DynamicBannerComponent from '@/features/shared/banners/components/banners/DynamicBanner.vue';
import { dismissBannerPermanently } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';

export const useBannersStore = defineStore(STORES.BANNERS, () => {
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const rootStore = useRootStore();

	// Dynamic banners fetched from API
	const dynamicBanners = ref<DynamicBanner[]>([]);

	// Banner stack for all banners (both static and dynamic)
	const bannerStack = ref<BannerName[]>([]);

	// Height of the banner area
	const bannersHeight = ref<number>(0);

	// Permanent dismissal of dynamic banners is stored per user in this browser.
	const getDismissedKey = () => `N8N_DISMISSED_DYNAMIC_BANNERS_${usersStore.currentUserId}`;

	const getDismissedDynamicBanners = (): string[] => {
		try {
			const parsed: unknown = JSON.parse(localStorage.getItem(getDismissedKey()) ?? '[]');
			return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
		} catch {
			return [];
		}
	};

	const setDismissedDynamicBanners = (ids: string[]) => {
		try {
			localStorage.setItem(getDismissedKey(), JSON.stringify(ids));
		} catch {
			// Storage unavailable: the banner is hidden for this session only.
		}
	};

	const mapDeploymentTypeValue = (deploymentType: string) => {
		return deploymentType === 'cloud' ? 'cloud' : 'self-hosted';
	};

	async function fetchDynamicBanners() {
		if (
			!settingsStore.settings.dynamicBanners.endpoint ||
			!settingsStore.settings.dynamicBanners.enabled
		) {
			return null;
		}
		const version = settingsStore.settings.versionCli;
		const deploymentType = mapDeploymentTypeValue(
			settingsStore.settings.deployment?.type ?? 'default',
		);

		try {
			dynamicBanners.value = (
				await getDynamicBanners(settingsStore.settings.dynamicBanners.endpoint, {
					version,
					deploymentType,
					instanceId: settingsStore.settings.instanceId,
					planName: settingsStore.settings.license?.planName,
					userId: usersStore.currentUser?.id,
					userCreatedAt: usersStore.currentUser?.createdAt,
					isOwner: usersStore.currentUser?.isOwner,
					role: usersStore.currentUser?.role,
					publishedWorkflowCount:
						settingsStore.settings.dynamicBanners.filters.publishedWorkflowCount,
				})
			).map((item) => ({
				...item,
				id: `dynamic-banner-${item.id}`,
				component: markRaw(DynamicBannerComponent as Component),
			}));
			return dynamicBanners.value;
		} catch (e) {
			console.error('Failed to fetch dynamic banners:', e);
			return null;
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
		if (type === 'permanent' && name in dynamicBannersMap.value) {
			setDismissedDynamicBanners([...getDismissedDynamicBanners(), name]);
			removeBannerFromStack(name);
			return;
		}
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

	const loadStaticBanners = (options: { banners: BannerName[] }) => {
		options.banners.forEach(pushBannerToStack);
	};

	const loadDynamicBanners = async () => {
		const userId = usersStore.currentUserId;
		const banners = await fetchDynamicBanners();
		// Ignore a response that arrives after another user signed in.
		if (!banners || usersStore.currentUserId !== userId) return;

		// Drop stored dismissals of banners that Strapi no longer returns.
		const dismissed = getDismissedDynamicBanners();
		const stillActive = dismissed.filter((id) => banners.some((banner) => banner.id === id));
		if (stillActive.length !== dismissed.length) setDismissedDynamicBanners(stillActive);

		banners
			// The instance-wide list still hides banners that an owner closed before this change.
			.filter(
				(banner) =>
					!stillActive.includes(banner.id) &&
					!settingsStore.permanentlyDismissedBanners.includes(banner.id),
			)
			.forEach((banner) => pushBannerToStack(banner.id));
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
		removeBannerFromStack,
		clearBannerStack,
		loadStaticBanners,
		loadDynamicBanners,
	};
});
