import type { ModuleRegistry } from '@n8n/backend-common';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

const REQUIRED_MODULES = ['agents', 'data-table'] as const;

/**
 * Agent evals read agents and Data Tables, whose entities only exist while those
 * modules are active. Callers must assert before their first repository touch,
 * or TypeORM raises a missing-metadata error instead of saying what is off.
 *
 * Not-found rather than bad-request: with `agents` off there is no agent to
 * address, and that module's own controller isn't even registered — so its routes
 * already 404. A nested agent surface answering 400 for the same instance state
 * would be the odd one out. The caller sent nothing wrong; the resource is
 * genuinely absent. The message still names the inactive module, so an operator
 * reading the response body gets the same diagnostic as before.
 */
export function assertRequiredModulesActive(moduleRegistry: ModuleRegistry): void {
	const inactive = REQUIRED_MODULES.filter((name) => !moduleRegistry.isActive(name));
	if (inactive.length > 0) {
		throw new NotFoundError(
			`Agent evals require these modules to be active: ${inactive.join(', ')}.`,
		);
	}
}
