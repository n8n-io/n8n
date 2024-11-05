import type { CurlToJSONResponse, IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getCurlToJson(
	context: IRestApiContext,
	curlCommand: string,
): Promise<CurlToJSONResponse> {
	return await makeRestApiRequest(context, 'POST', '/curl/to-json', { curlCommand });
}
