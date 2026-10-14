import { isRecord } from '@n8n/utils/is-record';
import { NodeApiError } from 'n8n-workflow';

/** The Data API serves the schema document here, so a missing-table code on this path means something else */
export const OPENAPI_PATH = /\/openapi\.json$/;

/** The Databricks UI path, so every message that names the setting stays in step */
export const OPENAPI_SETTING_PATH = 'Data API > API > Advanced settings > OpenAPI specification';

export const OPENAPI_DISABLED_NOTICE = `Turn on ${OPENAPI_SETTING_PATH} for this Lakebase project, so the node can list its columns.`;

export function isOpenApiUnavailable(error: unknown, url: string): boolean {
	if (!OPENAPI_PATH.test(url)) return false;

	const body = error instanceof NodeApiError ? error.context.data : undefined;
	return isRecord(body) && body.code === 'PGRST205';
}
