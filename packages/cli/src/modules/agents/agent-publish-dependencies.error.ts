import type { AgentPublishDependencyFailure } from '@n8n/api-types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * The agent stays unpublished because some of its workflow tools could not be
 * published. `meta` carries the failures so the UI can link to each workflow.
 */
export class AgentPublishDependenciesError extends BadRequestError {
	constructor(readonly meta: { failedDependencies: AgentPublishDependencyFailure[] }) {
		const failures = meta.failedDependencies.map(({ name, reason }) => `"${name}" (${reason})`);
		super(`Could not publish workflows used by this agent: ${failures.join('; ')}`);
		this.name = 'AgentPublishDependenciesError';
	}
}
