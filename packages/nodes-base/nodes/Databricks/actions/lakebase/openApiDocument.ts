import { isRecord } from '@n8n/utils/is-record';
import { NodeApiError } from 'n8n-workflow';

/** The Data API serves the schema document here, so a missing-table code on this path means something else */
export const OPENAPI_PATH = /\/openapi\.json$/;

export const OPENAPI_DISABLED_NOTICE =
	'Turn on Data API > API > Advanced settings > OpenAPI specification for this Lakebase project, so the node can list its columns.';

export function isOpenApiUnavailable(error: unknown, url: string): boolean {
	if (!OPENAPI_PATH.test(url)) return false;

	const body = error instanceof NodeApiError ? error.context.data : undefined;
	return isRecord(body) && body.code === 'PGRST205';
}

export const FUNCTION_ARGUMENTS_UNAVAILABLE_NOTICE =
	'The schema document lists no arguments for this function. If the function takes arguments, set Specify Arguments to Using JSON. If the project does not serve the document, turn on Data API > API > Advanced settings > OpenAPI specification.';
