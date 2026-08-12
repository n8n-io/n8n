import { INSTANCE_AI_THREAD_SOURCES, type InstanceAiThreadSource } from '@n8n/api-types';

import { TIME } from '@/app/constants';

export const INSTANCE_AI_VIEW = 'InstanceAi';
export const INSTANCE_AI_THREAD_VIEW = 'InstanceAiThread';
export const INSTANCE_AI_SETTINGS_VIEW = 'InstanceAiSettings';
export const INSTANCE_AI_PROJECT_ID_QUERY = 'projectId';
/**
 * History-state key for the agent id minted at the click. Carried to the
 * new-agent view so the "clicked" and "created" events share a join key even
 * though no agent exists yet. Kept out of the URL so a hand-authored query
 * cannot force the view to adopt an arbitrary id.
 */
export const INSTANCE_AI_PENDING_AGENT_ID_STATE = 'instanceAiPendingAgentId';
/** Entry-point source carried into the empty view when a hand-off can't create a thread yet. */
export const INSTANCE_AI_SOURCE_QUERY = 'source';

/** Brand names, deliberately not translated; single source for dialogs and settings rows. */
export const SANDBOX_PROVIDER_LABELS = {
	daytona: 'Daytona',
	'n8n-sandbox': 'n8n Sandbox Service',
} as const;

export type InstanceAiConnectionKind = 'model' | 'sandbox' | 'search';
export const INSTANCE_AI_NEW_VIEW = 'InstanceAiNew';
export const INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY = 'instanceAiAgentBuilderTarget';
/**
 * A new-agent artifact the user opened but has not configured yet, so no agent
 * row exists. Carries the id minted for it, which whichever path persists the
 * agent first creates it under. Mirrors `PENDING_AGENT_METADATA_KEY` in
 * `@n8n/instance-ai`.
 */
export const INSTANCE_AI_PENDING_AGENT_METADATA_KEY = 'instanceAiPendingAgentTarget';
export const NEW_CONVERSATION_TITLE = 'New conversation';
export { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
export const BROWSER_USE_CONNECTION_TYPE = 'browser-use';
export const COMPUTER_USE_CONNECTION_TYPE = 'computer-use';
export type BrowserUseConnectionType = typeof BROWSER_USE_CONNECTION_TYPE;
export type ComputerUseConnectionType = typeof COMPUTER_USE_CONNECTION_TYPE;

/**
 * How long the user must sit with a problem before a proactive offer appears.
 * Cheap proxy for "doesn't understand it" — see INS-1158.
 */
export const INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS = 3 * TIME.SECOND;

/** localStorage key for dismissed proactive offer keys. */
export const INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY =
	'n8n-instance-ai-proactive-dismissed-keys';

/** Query flag that raises the hardcoded demo offer (hackathon / local demos). */
export const INSTANCE_AI_DEMO_OFFER_QUERY = 'instanceAiDemoOffer';

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
