import '@n8n/backend-services';

import type { RecordedExecutionLimitChange } from './execution-limits.types';

export interface ExecutionLimitsEventMap {
	'execution-limit-updated': RecordedExecutionLimitChange;
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLimitsEventMap {}
}
