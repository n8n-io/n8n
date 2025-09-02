import { createEventBus } from '@n8n/utils/event-bus';

export interface FormPreviewEvents {
	'parameter-updated': { nodeId: string };
}

export const formPreviewEventBus = createEventBus<FormPreviewEvents>();
