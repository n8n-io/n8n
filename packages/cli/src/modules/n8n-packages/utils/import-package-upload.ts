import {
	IMPORT_PACKAGE_REQUEST_FORM_FIELDS,
	IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS,
} from '@n8n/api-types';

/** Max length for multipart text fields, including JSON credential bindings. */
export const IMPORT_PACKAGE_FIELD_SIZE_BYTES = 64 * 1024;

/**
 * `package` file + every documented form field, plus one because busboy rejects
 * the request when the part count reaches (not exceeds) the limit.
 */
export const IMPORT_PACKAGE_MAX_PARTS = IMPORT_PACKAGE_REQUEST_FORM_FIELDS.length + 2;

/**
 * `package` file + every documented selection form field, plus one because busboy rejects
 * the request when the part count reaches (not exceeds) the limit.
 */
export const IMPORT_PACKAGE_SELECTION_MAX_PARTS =
	IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS.length + 2;
