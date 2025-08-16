import { RESOURCES } from './constants.ee';
import type { Scope, ScopeInformation } from './types.ee';

function buildResourceScopes() {
	const resourceScopes = Object.entries(RESOURCES).flatMap(([resource, operations]) => [
		...operations.map((op) => `${resource}:${op}` as const),
		`${resource}:*` as const,
	]) as Scope[];

	resourceScopes.push('*' as const); // Global wildcard
	return resourceScopes;
}

export const ALL_SCOPES = buildResourceScopes();

export const scopeInformation: Partial<Record<Scope, ScopeInformation>> = {
	'annotationTag:create': {
		displayName: 'Create Annotation Tag',
		description: 'Allows creating new annotation tags.',
	},
};
