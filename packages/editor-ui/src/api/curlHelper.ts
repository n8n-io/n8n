import {CurlToJSONResponse, IRestApiContext} from "@/Interface";
import {makeRestApiRequest} from "@/api/helpers";

export async function getCurlToJson(context: IRestApiContext,  curlCommand: string): Promise<CurlToJSONResponse> {
	return makeRestApiRequest(context, 'POST', '/curl-to-json', { curlCommand });
}
