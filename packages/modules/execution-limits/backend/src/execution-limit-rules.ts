import { executionLimitSettingsSchema, type ExecutionLimitSettings } from '@n8n/api-types';

import type { ExecutionLimitChange } from './execution-limits.types';

export function diffLimitSettings(
	before: ExecutionLimitSettings,
	after: ExecutionLimitSettings,
): ExecutionLimitChange[] {
	return executionLimitSettingsSchema
		.keyof()
		.options.filter((field) => before[field] !== after[field])
		.map((field) => ({
			projectId: null,
			field,
			oldValue: before[field],
			newValue: after[field],
		}));
}
