import { createEventBus } from '@n8n/utils/event-bus';

export interface CommandBarEventBusEvents {
	/** Event that the command bar has opened */
	open: never;

	/** Request to open the command bar programmatically */
	'open:request': never;
}

export const commandBarEventBus = createEventBus<CommandBarEventBusEvents>();
