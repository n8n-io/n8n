/**
 * Constants consumed by `versions.store` (`@n8n/stores`). Relocated per-symbol
 * from `editor-ui`'s `@/app/constants` when the store moved into a package
 * (N8N-70). They live here because the modal keys have two consumers on
 * opposite sides of that boundary — the store, and the app-side registration in
 * `@/app/constants/modals` — and this package is a leaf both already depend on.
 */

export const LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES = 'N8N_READ_WHATS_NEW_ARTICLES';
export const LOCAL_STORAGE_DISMISSED_WHATS_NEW_CALLOUT = 'N8N_DISMISSED_WHATS_NEW_CALLOUT';

export const VERSIONS_MODAL_KEY = 'versions';
export const WHATS_NEW_MODAL_KEY = 'whatsNew';
