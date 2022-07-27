import {INodeTypeDescription} from "n8n-workflow";
import {makeRestApiRequest} from "@/api/helpers";
import {IRestApiContext} from "@/Interface";

export const getNodeTypes = async (context: IRestApiContext, onlyLatest = false): Promise<INodeTypeDescription[]> => {
	return makeRestApiRequest(context, 'GET', `/node-types`, {onlyLatest});
};
