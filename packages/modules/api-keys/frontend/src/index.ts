// The module's public entry for consumers. The shell imports the descriptor from
// `./api-keys.module` instead, so the boot chunk does not pull in the selector below.
//
// `ScopesSelector` is exported for the MCP OAuth consent screen in the shell
// (`app/views/OAuthConsentView.vue`).
export { default as ScopesSelector } from './components/scopes/ScopesSelector.vue';
export {
	DEFAULT_READ_SCOPE_ACTIONS,
	classifyScope,
	getReadOnlyScopes,
	groupScopes,
	inferSelectionMode,
} from './components/scopes/scopes.utils';
export type {
	ScopeAccess,
	ScopeGroup,
	ScopeGroupDefinition,
	ScopeSelectionMode,
} from './components/scopes/scopes.utils';
