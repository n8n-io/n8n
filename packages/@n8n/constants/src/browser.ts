/** `localStorage` key the per-browser identifier is persisted under. */
export const BROWSER_ID_STORAGE_KEY = 'n8n-browserId';

/**
 * Returns a stable per-browser identifier, generating and persisting one to
 * `localStorage` on first use. Sent as the `browser-id` header on authenticated
 * requests so the backend can bind session cookies to the browser that
 * requested them (see `AuthService.validateBrowserId`), preventing a stolen
 * cookie from being replayed from a different client.
 */
export function getBrowserId(): string {
	let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
	if (!browserId) {
		browserId = crypto.randomUUID();
		localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
	}
	return browserId;
}
