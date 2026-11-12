import type { Project } from '@n8n/rest-api-client';
import { createEventBus } from '@n8n/utils/event-bus';

export interface PromotionEventBusEvents {
	applied: { projectId: string; project?: Project };
	promoted: { projectId: string };
	projectRemoved: { projectId: string };
}

export const promotionEventBus = createEventBus<PromotionEventBusEvents>();
