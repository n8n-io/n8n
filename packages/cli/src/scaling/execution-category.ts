import type { WorkflowExecuteMode } from 'n8n-workflow';

import type { ExecutionCategory } from './scaling.types';

/** Map an execution mode to its pool category. Returns `undefined` for modes that run locally. */
export function getExecutionCategory(mode: WorkflowExecuteMode): ExecutionCategory | undefined {
	switch (mode) {
		case 'webhook':
		case 'trigger':
		case 'chat':
			return 'production';
		case 'manual':
		case 'retry':
			return 'manual';
		case 'evaluation':
			return 'evaluation';
		default:
			return undefined;
	}
}
