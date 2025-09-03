import { createEventBus } from '@n8n/utils/event-bus';

export interface FormPreviewEvents {
	'parameter-updated': { nodeId: string };
	'parameter-focused': { fieldId: string };
}

export const formPreviewEventBus = createEventBus<FormPreviewEvents>();
