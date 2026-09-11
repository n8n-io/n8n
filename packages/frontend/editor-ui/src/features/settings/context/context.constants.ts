import { AI_PREFERENCE_CONTENT_MAX_LENGTH, AI_PREFERENCES_DEFAULT_PAGE_SIZE } from '@n8n/api-types';

export const PREFERENCE_MODAL_KEY = 'preference';

/**
 * Single-sourced with the request schema, so the editor refuses the content the API
 * would refuse. A text column has no length of its own: the cap guards the AI prompt
 * the preferences are injected into.
 */
export const PREFERENCE_TEXT_MAX_LENGTH = AI_PREFERENCE_CONTENT_MAX_LENGTH;

export const PREFERENCES_PAGE_SIZES = [10, 25, 50];
export const PREFERENCES_DEFAULT_PAGE_SIZE = AI_PREFERENCES_DEFAULT_PAGE_SIZE;
