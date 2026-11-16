import { TELEMETRY_EVENT } from './telemetry-events';

/**
 * Events that the editor can send while the page hides or closes. The telemetry
 * SDK loses requests that start then, so the editor posts these to the backend
 * with a `keepalive` request, and the backend emits them. Every event here has
 * a `user_id` property, which the backend sets from the session.
 *
 * Add an event to this list only if it must survive a tab close. The backend
 * rejects every other event name.
 */
export const PAGE_HIDE_EVENTS = [
	TELEMETRY_EVENT.INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN,
];

export type PageHideEvent = (typeof PAGE_HIDE_EVENTS)[number];

export function findPageHideEvent(name: string): PageHideEvent | undefined {
	return PAGE_HIDE_EVENTS.find((event) => event.name === name);
}
