import type { ModuleRegistry } from '@n8n/backend-common';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const REQUIRED_MODULES = ['agents', 'data-table'] as const;

/**
 * Agent evals read agents and Data Tables, whose entities only exist while those
 * modules are active. Callers must assert before their first repository touch,
 * or TypeORM raises a missing-metadata error instead of saying what is off.
 */
export function assertRequiredModulesActive(moduleRegistry: ModuleRegistry): void {
	const inactive = REQUIRED_MODULES.filter((name) => !moduleRegistry.isActive(name));
	if (inactive.length > 0) {
		throw new BadRequestError(
			`Agent evals require these modules to be active: ${inactive.join(', ')}.`,
		);
	}
}
