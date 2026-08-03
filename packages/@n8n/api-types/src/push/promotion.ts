/**
 * Invalidation-only signal: promotion state can change without user action
 * (signal dispatch, PR poller), so clients refetch instead of mirroring
 * event payloads.
 */
export type PromotionsUpdated = {
	type: 'promotionsUpdated';
	data: {
		promotionId: string;
	};
};

export type PromotionPushMessage = PromotionsUpdated;
