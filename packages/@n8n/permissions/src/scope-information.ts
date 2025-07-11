import { RESOURCES } from './constants.ee';
import type { Scope, ScopeInformation } from './types.ee';

function buildResourceScopes() {
	const resourceScope = Object.keys(RESOURCES).flatMap((resource) => {
		const operations = RESOURCES[resource as keyof typeof RESOURCES];
		const resourceScope = operations.map(
			(operation) => `${resource}:${operation}` as const,
		) as string[];
		resourceScope.push(`${resource}:*` as const); // Add wildcard for all operations on this resource
		return resourceScope;
	}) as Scope[];
	resourceScope.push('*' as const); // Add wildcard scope
	return resourceScope;
}

export const ALL_SCOPES = buildResourceScopes();

export const scopeInformation: Partial<Record<Scope, ScopeInformation>> = {
	'annotationTag:create': {
		displayName: 'Create Annotation Tag',
		description: 'Allows creating new annotation tags.',
	},
};
