import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';

export interface SourceControlEventBusEvents {
	pull: never;
}

export type SourceControlEventBus = EventBus<SourceControlEventBusEvents>;

export const sourceControlEventBus = createEventBus<SourceControlEventBusEvents>();
