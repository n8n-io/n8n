import type { CanvasEventBusEvents } from '@/features/canvas/canvas.types';
import { createEventBus } from '@n8n/utils/event-bus';

export const canvasEventBus = createEventBus<CanvasEventBusEvents>();
