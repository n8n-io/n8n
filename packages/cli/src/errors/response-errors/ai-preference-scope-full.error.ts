import type { AiPreferenceScope } from '@n8n/api-types';

import { BadRequestError } from './bad-request.error';

/**
 * The per-scope cap refused a preference write. `meta` carries the numbers, so a
 * caller can answer with the limit and the measured count instead of parsing the
 * message. The HTTP serializer keeps `meta` internal, so the REST body is unchanged.
 */
export class AiPreferenceScopeFullError extends BadRequestError {
	constructor(
		scope: AiPreferenceScope,
		readonly meta: { limit: number; actual: number },
	) {
		super(`A ${scope} cannot hold more than ${meta.limit} preferences`);
		this.name = 'AiPreferenceScopeFullError';
	}
}
