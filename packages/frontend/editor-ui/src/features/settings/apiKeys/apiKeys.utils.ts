import type { ApiKeyScope } from '@n8n/permissions';

import { API_KEY_SCOPE_GROUPS, READ_SCOPE_ACTIONS } from './apiKeys.constants';

export type ApiKeyScopeAccess = 'read' | 'write';

export type ApiKeyScopeSelectionMode = 'all' | 'readOnly' | 'custom';

export interface ApiKeyScopeGroup {
	key: string;
	isFallback: boolean;
	scopes: ApiKeyScope[];
}

export function classifyScope(scope: ApiKeyScope): ApiKeyScopeAccess {
	const action = scope.split(':')[1];
	return (READ_SCOPE_ACTIONS as readonly string[]).includes(action) ? 'read' : 'write';
}

export function getReadOnlyScopes(availableScopes: ApiKeyScope[]): ApiKeyScope[] {
	return availableScopes.filter((scope) => classifyScope(scope) === 'read');
}

export function groupScopes(availableScopes: ApiKeyScope[]): ApiKeyScopeGroup[] {
	const scopesByResource = new Map<string, ApiKeyScope[]>();

	for (const scope of availableScopes) {
		const resource = scope.split(':')[0];
		const scopes = scopesByResource.get(resource) ?? [];
		scopes.push(scope);
		scopesByResource.set(resource, scopes);
	}

	const groups: ApiKeyScopeGroup[] = [];

	for (const { key, resources } of API_KEY_SCOPE_GROUPS) {
		const scopes = resources.flatMap((resource) => {
			const resourceScopes = scopesByResource.get(resource) ?? [];
			scopesByResource.delete(resource);
			return resourceScopes;
		});

		if (scopes.length > 0) {
			groups.push({ key, isFallback: false, scopes });
		}
	}

	// resources the server may add in the future or that are license-specific
	for (const [resource, scopes] of scopesByResource) {
		groups.push({ key: resource, isFallback: true, scopes });
	}

	return groups;
}

export function inferSelectionMode(
	selectedScopes: ApiKeyScope[],
	availableScopes: ApiKeyScope[],
): ApiKeyScopeSelectionMode {
	const selected = new Set(selectedScopes);

	const matches = (scopes: ApiKeyScope[]) =>
		scopes.length > 0 && scopes.length === selected.size && scopes.every((s) => selected.has(s));

	if (matches(availableScopes)) return 'all';
	if (matches(getReadOnlyScopes(availableScopes))) return 'readOnly';
	return 'custom';
}
