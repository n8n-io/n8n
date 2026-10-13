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
