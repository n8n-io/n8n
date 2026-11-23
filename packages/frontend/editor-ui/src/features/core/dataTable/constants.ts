import { DATA_TABLE_COLUMN_REGEX } from '@n8n/api-types';

export {
	DATA_TABLE_VIEW,
	PROJECT_DATA_TABLES,
	DATA_TABLE_DETAILS,
} from '@n8n/frontend-constants/data-tables';

export const DATA_TABLE_STORE = 'dataTableStore';

export const DEFAULT_DATA_TABLE_PAGE_SIZE = 10;

export const DATA_TABLE_ID_COLUMN_WIDTH = 60;

export const DEFAULT_COLUMN_WIDTH = 250;

export const DATA_TABLE_CARD_ACTIONS = {
	RENAME: 'rename',
	DELETE: 'delete',
	CLEAR: 'clear',
	DOWNLOAD_CSV: 'download-csv',
	FAVORITE: 'favorite',
	IMPORT_CSV: 'import-csv',
};

export const ADD_DATA_TABLE_MODAL_KEY = 'addDataTableModal';
export const DOWNLOAD_DATA_TABLE_MODAL_KEY = 'downloadDataTableModal';
export const IMPORT_CSV_MODAL_KEY = 'importCsvModal';

export const DEFAULT_ID_COLUMN_NAME = 'id';

export const MAX_COLUMN_NAME_LENGTH = 128;

export const COLUMN_NAME_REGEX = DATA_TABLE_COLUMN_REGEX;

export const MIN_LOADING_TIME = 500; // ms

export const MAX_CELL_DISPLAY_LENGTH = 10000;

export const DATA_TABLE_MODULE_NAME = 'data-table';
