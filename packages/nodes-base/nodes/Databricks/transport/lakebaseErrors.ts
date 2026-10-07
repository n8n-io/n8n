import { isRecord } from '@n8n/utils/is-record';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { makePermissionErrorLegible, sanitizeApiMessage } from '../actions/helpers';
import { OPENAPI_DISABLED_NOTICE, OPENAPI_PATH } from '../actions/lakebase/openApiDocument';

/**
 * Keyed on the code the Data API returns, never on its prose, because the wording
 * changes between versions. A Map so a key like `constructor` cannot match by accident.
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
	['PGRST102', 'Check the filter column, operator and value.'],
	['PGRST103', 'Check the filter column, operator and value.'],
	[
		'42501',
		'The Postgres role is not granted to the Data API. Run `GRANT "your-role" TO authenticator` as the role\'s creator. A project owner cannot use the Data API at all, so use a non-owner identity.',
	],
	['23505', 'A row with the same key already exists.'],
	['23502', 'A column that cannot be null has no value.'],
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
	if (!code) return;

	const hint =
		code === 'PGRST205' && OPENAPI_PATH.test(options.url)
			? OPENAPI_DISABLED_NOTICE
			: LAKEBASE_ERROR_HINTS.get(code);
	if (!hint) return;

	const apiMessage = typeof body.message === 'string' ? body.message : undefined;
	if (apiMessage) error.message = sanitizeApiMessage(apiMessage);

	// A description equal to the message is dropped, which would lose the fix
	if (hint !== error.message) error.description = hint;
}
