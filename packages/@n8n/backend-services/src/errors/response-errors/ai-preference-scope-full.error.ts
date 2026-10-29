import type { AiPreferenceScope } from '@n8n/api-types';

import { BadRequestError } from '@n8n/errors';

/** The per-scope cap refused a preference write. `meta` stays out of the REST body. */
export class AiPreferenceScopeFullError extends BadRequestError {
	constructor(
		scope: AiPreferenceScope,
		readonly meta: { limit: number; actual: number },
	) {
		super(`A ${scope} cannot hold more than ${meta.limit} preferences`);
		this.name = 'AiPreferenceScopeFullError';
	}
}
