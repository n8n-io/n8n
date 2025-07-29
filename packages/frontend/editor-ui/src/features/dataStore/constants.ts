import { createModuleConstants } from '@/utils/moduleConstants';

// Route and view identifiers
const constants = createModuleConstants('dataStore', {
	DATA_STORES: 'data-stores', // Keep original naming for compatibility
});

export const DATA_STORE_VIEW = constants.DATA_STORES;
export const PROJECT_DATA_STORES = constants.PROJECT_VIEW;
export const DATA_STORE_DETAILS = constants.DETAILS;

export const DEFAULT_DATA_STORE_PAGE_SIZE = 10;

export const DATA_STORE_CARD_ACTIONS = {
	RENAME: 'rename',
	DELETE: 'delete',
	CLEAR: 'clear',
};
