import type { PromotionsConfigView, PromotionSummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import * as promotionsApi from './promotions.api';

/**
 * Promotions are a small, instance-wide set (no pagination on the POC API),
 * so the store keeps the full list and refetches on invalidation pushes —
 * promotion state also moves without user action (signal dispatch, PR poller).
 */
export const usePromotionsStore = defineStore('promotions', () => {
	const rootStore = useRootStore();

	const items = ref<PromotionSummary[]>([]);
	const selectedId = ref<string | null>(null);
	const config = ref<PromotionsConfigView | null>(null);
	const loading = ref(false);
	const initialized = ref(false);

	const selected = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);

	function upsert(promotion: PromotionSummary) {
		const index = items.value.findIndex((item) => item.id === promotion.id);
		if (index === -1) {
			items.value = [promotion, ...items.value];
		} else {
			items.value = items.value.map((item) => (item.id === promotion.id ? promotion : item));
		}
	}

	async function fetchAll() {
		loading.value = !initialized.value;
		try {
			items.value = await promotionsApi.fetchPromotions(rootStore.restApiContext);
			initialized.value = true;
			if (selectedId.value && !selected.value) selectedId.value = null;
		} finally {
			loading.value = false;
		}
	}

	async function fetchConfig() {
		config.value = await promotionsApi.fetchPromotionsConfig(rootStore.restApiContext);
	}

	async function refetchOne(promotionId: string) {
		upsert(await promotionsApi.fetchPromotion(rootStore.restApiContext, promotionId));
	}

	async function create(payload: promotionsApi.CreatePromotionPayload) {
		const promotion = await promotionsApi.createPromotion(rootStore.restApiContext, payload);
		upsert(promotion);
		selectedId.value = promotion.id;
		return promotion;
	}

	async function runAction(promotionId: string, action: string, payload?: Record<string, unknown>) {
		const promotion = await promotionsApi.executePromotionAction(
			rootStore.restApiContext,
			promotionId,
			action,
			payload,
		);
		upsert(promotion);
		return promotion;
	}

	async function sync(promotionId: string) {
		const promotion = await promotionsApi.syncPromotion(rootStore.restApiContext, promotionId);
		upsert(promotion);
		return promotion;
	}

	function select(promotionId: string | null) {
		selectedId.value = promotionId;
	}

	function reset() {
		items.value = [];
		selectedId.value = null;
		initialized.value = false;
	}

	return {
		items,
		selectedId,
		selected,
		config,
		loading,
		initialized,
		fetchAll,
		fetchConfig,
		refetchOne,
		create,
		runAction,
		sync,
		select,
		reset,
	};
});
