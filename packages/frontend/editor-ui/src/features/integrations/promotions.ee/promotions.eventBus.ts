import { createEventBus } from '@n8n/utils/event-bus';
import type { Project } from '@/features/collaboration/projects/projects.types';

export interface PromotionEventBusEvents {
	applied: { projectId: string; project?: Project };
	projectRemoved: { projectId: string };
}

export const promotionEventBus = createEventBus<PromotionEventBusEvents>();
