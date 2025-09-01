import { createEventBus } from '@n8n/utils/event-bus';

export interface FormPreviewEvents {
	'parameter-updated': never;
}

export const formPreviewEventBus = createEventBus<FormPreviewEvents>();
