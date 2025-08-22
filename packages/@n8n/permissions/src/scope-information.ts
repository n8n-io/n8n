import { API_KEY_RESOURCES, RESOURCES } from './constants.ee';
import type { ApiKeyScope, Scope, ScopeInformation } from './types.ee';

function buildResourceScopes() {
	const resourceScopes = Object.entries(RESOURCES).flatMap(([resource, operations]) => [
		...operations.map((op) => `${resource}:${op}` as const),
		`${resource}:*` as const,
	]) as Scope[];

	resourceScopes.push('*' as const); // Global wildcard
	return resourceScopes;
}

function buildApiKeyScopes() {
	const apiKeyScopes = Object.entries(API_KEY_RESOURCES).flatMap(([resource, operations]) => [
		...operations.map((op) => `${resource}:${op}` as const),
	]) as ApiKeyScope[];

	return new Set(apiKeyScopes);
}

export const ALL_SCOPES = buildResourceScopes();

// Keep the type of Scope[] to ensure that ApiKeyScopes are a subset of Scopes!
export const ALL_API_KEY_SCOPES = buildApiKeyScopes();

export const scopeInformation: Partial<Record<Scope, ScopeInformation>> = {
	'annotationTag:create': {
		displayName: 'Create Annotation Tag',
		description: 'Allows creating new annotation tags.',
	},
};
