import type { ApiKeyScope } from '@n8n/permissions';

import {
	classifyScope as classifyScopeGeneric,
	getReadOnlyScopes as getReadOnlyScopesGeneric,
	groupScopes as groupScopesGeneric,
	inferSelectionMode as inferSelectionModeGeneric,
} from '@/app/components/scopes/scopes.utils';
import type {
	ScopeAccess,
	ScopeGroup,
	ScopeSelectionMode,
} from '@/app/components/scopes/scopes.utils';

import { API_KEY_SCOPE_GROUPS, READ_SCOPE_ACTIONS } from './apiKeys.constants';

export type ApiKeyScopeAccess = ScopeAccess;

export type ApiKeyScopeSelectionMode = ScopeSelectionMode;

export type ApiKeyScopeGroup = ScopeGroup<ApiKeyScope>;

export function classifyScope(scope: ApiKeyScope): ApiKeyScopeAccess {
	return classifyScopeGeneric(scope, READ_SCOPE_ACTIONS);
}

export function getReadOnlyScopes(availableScopes: ApiKeyScope[]): ApiKeyScope[] {
	return getReadOnlyScopesGeneric(availableScopes, READ_SCOPE_ACTIONS);
}

export function groupScopes(availableScopes: ApiKeyScope[]): ApiKeyScopeGroup[] {
	return groupScopesGeneric(availableScopes, API_KEY_SCOPE_GROUPS);
}

export function inferSelectionMode(
	selectedScopes: ApiKeyScope[],
	availableScopes: ApiKeyScope[],
): ApiKeyScopeSelectionMode {
	return inferSelectionModeGeneric(selectedScopes, availableScopes, READ_SCOPE_ACTIONS);
}
