import '@n8n/backend-services';

import type { ExecutionLimitChange } from './execution-limits.types';

export interface ExecutionLimitsEventMap {
	'execution-limit-updated': ExecutionLimitChange & {
		updatedBy: string | null;
		loginId?: string;
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLimitsEventMap {}
}
