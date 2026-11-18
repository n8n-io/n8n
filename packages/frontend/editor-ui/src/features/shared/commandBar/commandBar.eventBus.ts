import { createEventBus } from '@n8n/utils/event-bus';

export interface CommandBarEventBusEvents {
	/** Event that the command bar has opened */
	open: never;
	/** Request to open the command bar with the results of one source only, e.g. settings */
	'open-source': { sourceId: string };
}

export const commandBarEventBus = createEventBus<CommandBarEventBusEvents>();
