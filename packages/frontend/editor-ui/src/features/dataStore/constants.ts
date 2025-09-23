import { DATA_STORE_COLUMN_REGEX } from '@n8n/api-types';

// Route and view identifiers
export const DATA_STORE_VIEW = 'data-stores';
export const PROJECT_DATA_STORES = 'project-data-stores';
export const DATA_STORE_DETAILS = 'data-store-details';
export const DATA_STORE_STORE = 'dataStoreStore';

export const DEFAULT_DATA_STORE_PAGE_SIZE = 10;

export const DATA_STORE_ID_COLUMN_WIDTH = 60;

export const DEFAULT_COLUMN_WIDTH = 250;

export const DATA_STORE_HEADER_HEIGHT = 36;
export const DATA_STORE_ROW_HEIGHT = 33;

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

export const NUMBER_WITH_SPACES_REGEX = /\B(?=(\d{3})+(?!\d))/g;
export const NUMBER_THOUSAND_SEPARATOR = ' ';
export const NUMBER_DECIMAL_SEPARATOR = '.';

// Allows 1-2 digit month/day/time parts (e.g., 2025-1-1 2:3:4)
export const LOOSE_DATE_REGEX =
	/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[ T]([0-9]{1,2}):([0-9]{1,2})(?::([0-9]{1,2}))?)?$/;
