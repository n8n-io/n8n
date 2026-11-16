import { getBrowserId } from '@n8n/constants';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { InferTelemetryProps, PageHideEvent } from '@n8n/telemetry';

/**
 * Sends a telemetry event that must survive the page hiding or closing. The
 * telemetry SDK loses requests that start then, so the backend emits the event
 * (see `PAGE_HIDE_EVENTS` in `@n8n/telemetry`). The request uses `fetch` with
 * `keepalive`, because the browser lets it finish after the page is gone, and a
 * beacon cannot send the `browser-id` header that authentication needs.
 *
 * The backend sets `user_id` from the session. Telemetry must never fail the
 * page, so errors are ignored.
 */
export function trackOnPageHide<T extends PageHideEvent>(
	context: IRestApiContext,
	event: T,
	properties: Omit<InferTelemetryProps<T>, 'user_id'>,
): void {
	void fetch(`${context.baseUrl}/telemetry/page-hide`, {
		method: 'POST',
		keepalive: true,
		credentials: 'include',
		headers: { 'browser-id': getBrowserId(), 'Content-Type': 'application/json' },
		body: JSON.stringify({ event: event.name, properties }),
	}).catch(() => {});
}
