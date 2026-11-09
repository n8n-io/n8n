import { isRecord } from '@n8n/utils/is-record';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { makePermissionErrorLegible, sanitizeApiMessage } from '../actions/helpers';
import { OPENAPI_DISABLED_NOTICE, OPENAPI_PATH } from '../actions/lakebase/openApiDocument';

// Keyed on 503 with no PostgREST code: that is the only shape this setting produces
const DATA_API_DISABLED_HINT =
	'Enable the Data API on the branch in Databricks (App Backend > Data API). A retry does not help until it is on.';

/**
 * Keyed on the code the Data API returns, never on its prose, because the wording
 * changes between versions. A Map so a key like `constructor` cannot match by accident.
 * When the map has no entry, the `hint` field of the body is the fallback.
 */
export const LAKEBASE_ERROR_HINTS = new Map<string, string>([
	[
		'PGRST205',
		'Check the schema and table names. The table also has to be in a schema the Data API exposes.',
	],
	[
		'PGRST204',
		'A column in the mapping is not in the table. Reopen the node to refresh the column list.',
	],
	[
		'PGRST106',
		'The schema is not one the Data API exposes. Add it to the exposed schemas in Databricks.',
	],
	[
		'PGRST301',
		"Reconnect the Databricks OAuth2 credential. If it is valid, the identity has no Postgres role on this branch: run `SELECT databricks_create_role('your-identity', 'SERVICE_PRINCIPAL')` in the Databricks SQL editor, using 'USER' for a user identity.",
	],
	['PGRST100', 'Check the filter column, operator and value.'],
	[
		'PGRST102',
		'The Data API could not read the request body. Check the column values being written.',
	],
	['PGRST103', 'The requested range of rows is not valid. Check the limit and offset.'],
	[
		'42501',
		'The Postgres role is not granted to the Data API. Run `GRANT "your-role" TO authenticator` as the role\'s creator. A project owner cannot use the Data API at all, so use a non-owner identity.',
	],
	[
		'42P10',
		'The columns to match on must together carry a unique constraint or a primary key. A composite key needs every one of its columns selected. If the table has no such constraint, add one in Databricks.',
	],
	[
		'23503',
		'If you insert or update a row, the row it points at must exist. If you delete a row, delete the rows that point at it first, or set the foreign key to cascade.',
	],
	['22P02', "A value does not fit the column's type."],
	['23505', 'A row with the same key already exists.'],
	['23502', 'A column that cannot be null has no value.'],
	['23514', "A value breaks a rule the table enforces. Check the column's allowed values."],
]);

/**
 * Replaces the generic status message with what the Data API said, and puts the
 * fix in the description.
 *
 * Mutates rather than re-wraps: passing a NodeApiError back through the
 * constructor returns the same instance and discards the new options.
 */
export function makeLakebaseErrorLegible(error: unknown, options: IHttpRequestOptions): void {
	if (!(error instanceof NodeApiError)) return;

	const body = error.context.data;
	if (!isRecord(body)) return;

	// The workspace API fronts the same host and reports a different shape
	if (typeof body.error_code === 'string') {
		makePermissionErrorLegible(error);
		return;
	}

	const code = typeof body.code === 'string' ? body.code : undefined;
	const apiMessage = typeof body.message === 'string' && body.message ? body.message : undefined;

	const knownHint = code
		? code === 'PGRST205' && OPENAPI_PATH.test(options.url)
			? OPENAPI_DISABLED_NOTICE
			: LAKEBASE_ERROR_HINTS.get(code)
		: error.httpCode === '503'
			? DATA_API_DISABLED_HINT
			: undefined;
	// Postgres text (`RAISE ... USING HINT`), so it is sanitized like the message
	const bodyHint =
		typeof body.hint === 'string' && body.hint ? sanitizeApiMessage(body.hint) : undefined;
	const hint = knownHint ?? bodyHint;
	if (!apiMessage && !hint) return;

	if (apiMessage) error.message = sanitizeApiMessage(apiMessage);

	// NodeApiError copies the body message into the description, so a promoted
	// message without a hint must clear it or the user reads the same text twice
	error.description = hint !== error.message ? hint : undefined;
}
