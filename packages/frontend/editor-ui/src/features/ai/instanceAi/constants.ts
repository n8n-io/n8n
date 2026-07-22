import { INSTANCE_AI_THREAD_SOURCES, type InstanceAiThreadSource } from '@n8n/api-types';

export const INSTANCE_AI_VIEW = 'InstanceAi';
export const INSTANCE_AI_THREAD_VIEW = 'InstanceAiThread';
export const INSTANCE_AI_SETTINGS_VIEW = 'InstanceAiSettings';
export const INSTANCE_AI_PROJECT_ID_QUERY = 'projectId';
/** Entry-point source carried into the empty view when a hand-off can't create a thread yet. */
export const INSTANCE_AI_SOURCE_QUERY = 'source';

export const INSTANCE_MODEL_CREDENTIAL_TYPES = [
	'openAiApi',
	'anthropicApi',
	'googlePalmApi',
	'groqApi',
	'deepSeekApi',
	'mistralCloudApi',
	'xAiApi',
	'openRouterApi',
	'cohereApi',
] as const;

export const INSTANCE_SEARCH_CREDENTIAL_TYPES = ['braveSearchApi', 'searXngApi'] as const;

/** Brand names, deliberately not translated; single source for dialogs and settings rows. */
export const SANDBOX_PROVIDER_LABELS = {
	daytona: 'Daytona',
	'n8n-sandbox': 'n8n Sandbox Service',
} as const;

export type InstanceAiConnectionKind = 'model' | 'sandbox' | 'search';
export const INSTANCE_AI_NEW_VIEW = 'InstanceAiNew';
export const INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY = 'instanceAiAgentBuilderTarget';
export const NEW_CONVERSATION_TITLE = 'New conversation';
export { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
export const BROWSER_USE_CONNECTION_TYPE = 'browser-use';
export const COMPUTER_USE_CONNECTION_TYPE = 'computer-use';
export type BrowserUseConnectionType = typeof BROWSER_USE_CONNECTION_TYPE;
export type ComputerUseConnectionType = typeof COMPUTER_USE_CONNECTION_TYPE;

const INSTANCE_AI_THREAD_SOURCE_SET: ReadonlySet<string> = new Set(INSTANCE_AI_THREAD_SOURCES);

export function isInstanceAiThreadSource(value: unknown): value is InstanceAiThreadSource {
	return typeof value === 'string' && INSTANCE_AI_THREAD_SOURCE_SET.has(value);
}

const INSTANCE_AI_CHAT_ROUTE_NAMES: ReadonlySet<string> = new Set([
	INSTANCE_AI_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_NEW_VIEW,
]);

/**
 * True while the route stays inside the chat module. Teardown hooks check this
 * because entering the module can transiently remount its layout, and a remount
 * must not be mistaken for a real route exit.
 */
export function isInstanceAiChatRoute(name: unknown): boolean {
	return typeof name === 'string' && INSTANCE_AI_CHAT_ROUTE_NAMES.has(name);
}
