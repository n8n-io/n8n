import { API_KEY_RESOURCES } from '@n8n/permissions';

import { resolvePublicApiRoutes, scopesInRequirement } from '../../public-api-route-resolver';

import '../controllers';

describe('Public API scope parity', () => {
	test('every API key scope in API_KEY_RESOURCES is consumed by at least one endpoint', () => {
		const consumed = new Set<string>(
			resolvePublicApiRoutes().flatMap((route) =>
				route.apiKeyScope ? scopesInRequirement(route.apiKeyScope) : [],
			),
		);
		const declared = new Set<string>();
		for (const [resource, operations] of Object.entries(API_KEY_RESOURCES)) {
			for (const operation of operations) {
				declared.add(`${resource}:${operation}`);
			}
		}
		const orphans = [...declared].filter((scope) => !consumed.has(scope));
		expect(orphans).toEqual([]);
	});
});
