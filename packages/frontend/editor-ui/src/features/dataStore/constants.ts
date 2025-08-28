import { DATA_STORE_COLUMN_REGEX } from '@n8n/api-types';

// Route and view identifiers
export const DATA_STORE_VIEW = 'data-stores';
export const PROJECT_DATA_STORES = 'project-data-stores';
export const DATA_STORE_DETAILS = 'data-store-details';
export const DATA_STORE_STORE = 'dataStoreStore';

export const DEFAULT_DATA_STORE_PAGE_SIZE = 10;

export const DATA_STORE_ID_COLUMN_WIDTH = 46;

export const DATA_STORE_HEADER_HEIGHT = 36;
export const DATA_STORE_ROW_HEIGHT = 43;

export const ADD_ROW_ROW_ID = '__n8n_add_row__';

export const DATA_STORE_CARD_ACTIONS = {
	RENAME: 'rename',
	DELETE: 'delete',
	CLEAR: 'clear',
};

export const ADD_DATA_STORE_MODAL_KEY = 'addDataStoreModal';

export const DEFAULT_ID_COLUMN_NAME = 'id';

export const MAX_COLUMN_NAME_LENGTH = 128;

export const COLUMN_NAME_REGEX = DATA_STORE_COLUMN_REGEX;

export const MIN_LOADING_TIME = 500; // ms

export const NULL_VALUE = 'Null';
export const EMPTY_VALUE = 'Empty';

export const DATA_STORE_MODULE_NAME = 'data-table';
