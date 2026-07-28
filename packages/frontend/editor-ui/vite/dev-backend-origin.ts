/**
 * Origin the Vite dev server points the `/{{BASE_PATH}}/static/*` tags at.
 *
 * Those three tags (`base-path.js`, `prefers-color-scheme.css`, `posthog.init.js`)
 * are served by the n8n backend, not by Vite, so the dev server has to rewrite the
 * placeholder to an absolute origin. Derived from the same variable the app itself
 * uses to find the backend, so a non-default `N8N_PORT` still resolves; falls back
 * to the historical default when unset.
 */
export function resolveDevBackendOrigin(baseApiUrl: string | undefined): string {
	if (!baseApiUrl) return DEFAULT_DEV_BACKEND_ORIGIN;

	const trimmed = baseApiUrl.replace(/\/+$/, '');

	// A relative value (`/`, `/api/`) would rewrite the tags to a Vite-server-relative
	// path, where they 404 — Vite has no `/static` route. Only an absolute origin can
	// stand in for the backend.
	return /^([a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed) ? trimmed : DEFAULT_DEV_BACKEND_ORIGIN;
}

const DEFAULT_DEV_BACKEND_ORIGIN = '//localhost:5678';
