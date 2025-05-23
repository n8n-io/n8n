import type { CanvasEventBusEvents } from '@/types';
import { createEventBus } from '@n8n/utils/event-bus';

export const canvasEventBus = createEventBus<CanvasEventBusEvents>();
