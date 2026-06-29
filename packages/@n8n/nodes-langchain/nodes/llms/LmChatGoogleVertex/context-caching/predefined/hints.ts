import type { NodeExecutionHint } from 'n8n-workflow';

import { PREDEFINED_CACHE_IGNORED_SYSTEM_MESSAGE } from './consts';

export function vertexContextCachePredefinedIgnoredSystemHint(): NodeExecutionHint {
	return {
		location: 'outputPane',
		message: PREDEFINED_CACHE_IGNORED_SYSTEM_MESSAGE,
		type: 'warning',
	};
}
