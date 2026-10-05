// ---------------------------------------------------------------------------
// The single build-expectation text a routing case carries.
//
// LangTracer matches a result's build expectation to the case's stored
// expectation by exact (trimmed) text, so the push script and the
// eval-results writer must produce the same string from the same accepts.
// ---------------------------------------------------------------------------

import type { RoutingCase } from './loader';

const EXPECTATION_PREFIX = 'Routes to one of: ';

export function routingExpectationText(accepts: RoutingCase['accepts']): string {
	return `${EXPECTATION_PREFIX}${accepts.join(', ')}`;
}
