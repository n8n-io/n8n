export type ScopeAccess = 'read' | 'write';

export type ScopeSelectionMode = 'all' | 'readOnly' | 'custom';

export interface ScopeGroup<S extends string = string> {
	key: string;
	isFallback: boolean;
	scopes: S[];
}

/** Group definition: which `resource:` prefixes belong under which display group. */
export interface ScopeGroupDefinition {
	key: string;
	resources: readonly string[];
}

// Actions treated as read-only for the "Read only" preset and the read/write badge.
// `export` is intentionally included: it is non-mutating, even though `workflow:export`
// returns the full workflow definition.
export const DEFAULT_READ_SCOPE_ACTIONS = ['read', 'list', 'export'] as const;

export function classifyScope(
	scope: string,
	readActions: readonly string[] = DEFAULT_READ_SCOPE_ACTIONS,
): ScopeAccess {
	const action = scope.split(':')[1];
	return readActions.includes(action) ? 'read' : 'write';
}

export function getReadOnlyScopes<S extends string>(
	availableScopes: S[],
	readActions: readonly string[] = DEFAULT_READ_SCOPE_ACTIONS,
): S[] {
	return availableScopes.filter((scope) => classifyScope(scope, readActions) === 'read');
}

export function groupScopes<S extends string>(
	availableScopes: S[],
	groupDefinitions: readonly ScopeGroupDefinition[],
): Array<ScopeGroup<S>> {
	const scopesByResource = new Map<string, S[]>();

	for (const scope of availableScopes) {
		const resource = scope.split(':')[0];
		const scopes = scopesByResource.get(resource) ?? [];
		scopes.push(scope);
		scopesByResource.set(resource, scopes);
	}

	const groups: Array<ScopeGroup<S>> = [];

	for (const { key, resources } of groupDefinitions) {
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

export function inferSelectionMode<S extends string>(
	selectedScopes: S[],
	availableScopes: S[],
	readActions: readonly string[] = DEFAULT_READ_SCOPE_ACTIONS,
): ScopeSelectionMode {
	const selected = new Set(selectedScopes);

	const matches = (scopes: S[]) =>
		scopes.length > 0 && scopes.length === selected.size && scopes.every((s) => selected.has(s));

	if (matches(availableScopes)) return 'all';
	if (matches(getReadOnlyScopes(availableScopes, readActions))) return 'readOnly';
	return 'custom';
}
