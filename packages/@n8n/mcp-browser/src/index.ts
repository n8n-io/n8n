export { BrowserConnection } from './connection';
export type { BrowserConnectionOptions } from './connection';
export { CDPRelayServer } from './cdp-relay';
export type { CDPRelayServerOptions } from './cdp-relay';
export { BROWSER_USE_EXTENSION_ID, buildExtensionConnectUrl } from './extension-connect';
// Exposed for the eval harness's local (real-site) browser mode, which needs the
// developer's installed browser AND its profile directory. Export-only: no
// behaviour here changes.
export { BrowserDiscovery, getDefaultDiscovery } from './browser-discovery';
export { createBrowserTools } from './tools/index';
export { configureLogger } from './logger';
export type { LogLevel } from './logger';
export { parseServerOptions } from './server-config';
export type { ServerOptions } from './server-config';
export type {
	AffectedResource,
	AffectedResourceKind,
	BrowserInfo,
	DiscoveredBrowsers,
	BrowserName,
	BrowserToolkit,
	Config,
	ConnectConfig,
	ConnectResult,
	ConnectionState,
	Cookie,
	CreateCredentialPayload,
	ElementTarget,
	PageInfo,
	ResolvedConfig,
	SecretsBuffer,
	ToolContext,
	ToolDefinition,
	CallToolResult,
} from './types';
export type {
	Answer,
	ChoiceQuestion,
	FieldTextFn,
	FieldTextRequest,
	NoulQuestion,
	Question,
	RecentAction,
	SystemOneFn,
	SystemOneResult,
	TaskBrief,
} from './typesafe/types';
export {
	ACTIONS_TAKING_REF,
	buildRequest,
	EXECUTABLE_ACTIONS,
	GUARD_QUESTIONS,
	HANDBACK_ACTIONS,
	pagedTargetRefKey,
	TARGET_REF_NONE,
	TARGET_REF_QUESTION,
} from './typesafe/questions';
export { decide, GUARD_THRESHOLD, pickRef } from './typesafe/decide';
export { createSystemOneFn, DEFAULT_SYSTEM_ONE_MODEL } from './typesafe/client';
export type { SystemOneOptions } from './typesafe/client';
export type { Decision } from './typesafe/decide';
export {
	actionCandidates,
	estimateTokens,
	MAX_CANDIDATES,
	MAX_CHOICE_OPTIONS,
	parseOptionLabels,
	parseSnapshot,
	toChoiceCriteria,
} from './typesafe/snapshot-elements';
export type { SnapshotElement } from './typesafe/snapshot-elements';
