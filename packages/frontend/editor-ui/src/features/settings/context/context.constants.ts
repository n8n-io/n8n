export const PREFERENCE_MODAL_KEY = 'preference';

/**
 * `ai_preference.content` is a text column, so this cap is a UI-side token guard
 * rather than a storage limit. Preferences are injected into AI prompts.
 */
export const PREFERENCE_TEXT_MAX_LENGTH = 2000;

export const PREFERENCES_PAGE_SIZES = [10, 25, 50];
export const PREFERENCES_DEFAULT_PAGE_SIZE = 50;
