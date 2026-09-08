export const CONTEXT_PREFERENCES_FLAG = '111_context_preferences';

export const PREFERENCE_MODAL_KEY = 'preference';

/**
 * Preferences are injected into the assistant system prompt, so this cap is a token
 * guard rather than a storage limit.
 */
export const PREFERENCE_TEXT_MAX_LENGTH = 2000;

export const PREFERENCES_PAGE_SIZES = [10, 25, 50];
export const PREFERENCES_DEFAULT_PAGE_SIZE = 50;
