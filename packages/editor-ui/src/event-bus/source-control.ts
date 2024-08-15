import { createEventBus } from 'n8n-design-system/utils';

export interface SourceControlEventBusEvents {
	/** Event when latest changes were pulled from the source control */
	pull: never;
}

export const sourceControlEventBus = createEventBus<SourceControlEventBusEvents>();
