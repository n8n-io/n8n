/**
 * Constants owned by `versions.store`. Relocated per-symbol from
 * `editor-ui`'s `@/app/constants` so the store can live in this package
 * (N8N-70); the modal keys are re-exported from `@/app/constants/modals` for
 * the app-side call sites that register and open those modals.
 */

export const LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES = 'N8N_READ_WHATS_NEW_ARTICLES';
export const LOCAL_STORAGE_DISMISSED_WHATS_NEW_CALLOUT = 'N8N_DISMISSED_WHATS_NEW_CALLOUT';

export const VERSIONS_MODAL_KEY = 'versions';
export const WHATS_NEW_MODAL_KEY = 'whatsNew';
