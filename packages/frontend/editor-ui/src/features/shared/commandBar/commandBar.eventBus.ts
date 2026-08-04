import { createEventBus } from '@n8n/utils/event-bus';

export interface CommandBarEventBusEvents {
	/** Event that the command bar has opened */
	open: never;
}

export const commandBarEventBus = createEventBus<CommandBarEventBusEvents>();
