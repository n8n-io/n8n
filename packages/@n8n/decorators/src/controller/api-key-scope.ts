import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { ApiKeyScopeRequirement, Controller } from './types';

function isBareArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Declares the API-key scope(s) required for a public API route.
 *
 * Accepts a single scope string, or `{ anyOf }` / `{ allOf }` for multiples.
 * Bare arrays are rejected (ambiguous between any-of and all-of).
 *
 * The PublicApiControllerRegistry enforces the check against
 * `req.tokenGrant.apiKeyScopes`.
 *
 * @example
 * ```ts
 * @ApiKeyScope('tag:list')
 * @ApiKeyScope({ anyOf: ['workflow:read', 'workflow:list'] })
 * @ApiKeyScope({ allOf: ['project:read', 'project:update'] })
 * ```
 */
export const ApiKeyScope =
	(requirement: ApiKeyScopeRequirement): MethodDecorator =>
	(target, handlerName) => {
		if (isBareArray(requirement)) {
			throw new Error(
				'@ApiKeyScope does not accept a bare array — use { anyOf: [...] } or { allOf: [...] }',
			);
		}

		if (typeof requirement === 'object') {
			const hasAnyOf = 'anyOf' in requirement;
			const hasAllOf = 'allOf' in requirement;
			if (hasAnyOf && hasAllOf) {
				throw new Error(
					'@ApiKeyScope does not accept both anyOf and allOf — pick one authorization rule',
				);
			}
			if (hasAnyOf && requirement.anyOf.length === 0) {
				throw new Error('@ApiKeyScope({ anyOf }) requires at least one scope');
			}
			if (hasAllOf && requirement.allOf.length === 0) {
				throw new Error('@ApiKeyScope({ allOf }) requires at least one scope');
			}
		}

		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.apiKeyScope = requirement;
	};
