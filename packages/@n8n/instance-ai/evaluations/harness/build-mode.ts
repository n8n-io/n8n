import type { InstanceAiBuildMode } from '@n8n/api-types';

import type { WorkflowTestCase } from '../types';

/** Case overrides take precedence. Validate the environment only when it is used. */
export function resolveEvalBuildMode(
	buildMode: WorkflowTestCase['buildMode'],
): InstanceAiBuildMode | undefined {
	const mode = buildMode ?? process.env.N8N_EVAL_BUILD_MODE?.trim();
	if (!mode || mode === 'default') return undefined;
	if (mode === 'progressive') return mode;
	throw new Error('N8N_EVAL_BUILD_MODE must be "progressive" or "default", or unset');
}
