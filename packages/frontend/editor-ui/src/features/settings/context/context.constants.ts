import { AI_PREFERENCE_CONTENT_MAX_LENGTH, AI_PREFERENCES_DEFAULT_PAGE_SIZE } from '@n8n/api-types';
import type { TableOptions } from '@n8n/design-system';

/** Single-sourced with the request schema. */
export const PREFERENCE_TEXT_MAX_LENGTH = AI_PREFERENCE_CONTENT_MAX_LENGTH;

export const PREFERENCES_PAGE_SIZES = [10, 25, 50];
export const PREFERENCES_DEFAULT_PAGE_SIZE = AI_PREFERENCES_DEFAULT_PAGE_SIZE;
export const PREFERENCES_DEFAULT_SORT_BY: TableOptions['sortBy'] = [
	{ id: 'updatedAt', desc: true },
];
