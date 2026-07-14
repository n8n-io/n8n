export const INSTANCE_AI_VIEW = 'InstanceAi';
export const INSTANCE_AI_THREAD_VIEW = 'InstanceAiThread';
export const INSTANCE_AI_SETTINGS_VIEW = 'InstanceAiSettings';
export const NEW_CONVERSATION_TITLE = 'New conversation';
export { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
export const BROWSER_USE_CONNECTION_TYPE = 'browser-use';
export const COMPUTER_USE_CONNECTION_TYPE = 'computer-use';
export type BrowserUseConnectionType = typeof BROWSER_USE_CONNECTION_TYPE;
export type ComputerUseConnectionType = typeof COMPUTER_USE_CONNECTION_TYPE;

/**
 * localStorage flag for the pulsing-dot variant of the live thinking
 * indicators (status bar + thinking-block subline). Design comparison only:
 * `localStorage.setItem('N8N_INSTANCE_AI_THINKING_DOT', 'true')` + reload.
 */
export const THINKING_DOT_STORAGE_KEY = 'N8N_INSTANCE_AI_THINKING_DOT';

export function isThinkingDotEnabled(): boolean {
	try {
		return localStorage.getItem(THINKING_DOT_STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}
