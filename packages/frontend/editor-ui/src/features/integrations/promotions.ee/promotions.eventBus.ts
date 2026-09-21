import { createEventBus } from '@n8n/utils/event-bus';

export interface PromotionEventBusEvents {
	applied: never;
}

export const promotionEventBus = createEventBus<PromotionEventBusEvents>();
