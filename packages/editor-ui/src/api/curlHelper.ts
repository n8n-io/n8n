import {CurlToJSONResponse, IRestApiContext} from "@/Interface";
import {makeRestApiRequest} from "@/api/helpers";

export function getCurlToJson(context: IRestApiContext,  curlCommand: string): Promise<CurlToJSONResponse> {
	return makeRestApiRequest(context, 'POST', '/curl-to-json', { curlCommand });
}
