import {IRestApiContext} from "@/Interface";
import {makeRestApiRequest} from "@/api/helpers";
import { IDataObject } from "n8n-workflow";

export function getADConfig(context: IRestApiContext): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'GET', '/active-directory/config');
}
