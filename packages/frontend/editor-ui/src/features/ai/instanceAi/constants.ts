export const INSTANCE_AI_VIEW = 'InstanceAi';
export const INSTANCE_AI_THREAD_VIEW = 'InstanceAiThread';
export const INSTANCE_AI_SETTINGS_VIEW = 'InstanceAiSettings';
export const INSTANCE_AI_NEW_VIEW = 'InstanceAiNew';
export const NEW_CONVERSATION_TITLE = 'New conversation';
export { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
export const BROWSER_USE_CONNECTION_TYPE = 'browser-use';
export const COMPUTER_USE_CONNECTION_TYPE = 'computer-use';
export type BrowserUseConnectionType = typeof BROWSER_USE_CONNECTION_TYPE;
export type ComputerUseConnectionType = typeof COMPUTER_USE_CONNECTION_TYPE;

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
