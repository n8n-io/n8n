import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';

export interface SourceControlEventBusEvents {
	pull: never;
}

export const sourceControlEventBus = createEventBus<SourceControlEventBusEvents>();
