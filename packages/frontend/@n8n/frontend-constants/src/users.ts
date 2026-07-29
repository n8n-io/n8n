/**
 * Constants consumed by `users.store` (`@n8n/stores`). The modal key lives here
 * because it has two consumers on opposite sides of the package boundary — the
 * store's `showPersonalizationSurvey`, and the app-side registration in
 * editor-ui's `users.constants` — and this package is a leaf both already
 * depend on, so nothing can invert.
 */

export const PERSONALIZATION_MODAL_KEY = 'personalization';
