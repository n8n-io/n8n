import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { filterModelsForOperation } from '../helpers/modelCapabilities';
import {
	defaultOperationForResource,
	ensurePreferredModelInOptions,
	getDefaultModelIdForLoadOptions,
	normalizeOperationForLoadOptions,
	normalizeResourceForLoadOptions,
} from '../helpers/loadOptionsModelList';
import {
	fetchN8nAiGatewayOpenRouterModels,
	mapOpenRouterModelsToLoadOptions,
} from '../../../../utils/n8nAiGatewayOpenRouter';

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const models = await fetchN8nAiGatewayOpenRouterModels(this.helpers);

	const resource = normalizeResourceForLoadOptions(this.getNodeParameter('resource', 'text'));
	const operation = normalizeOperationForLoadOptions(
		resource,
		this.getNodeParameter('operation', defaultOperationForResource(resource)),
	);

	const filtered = filterModelsForOperation(models, resource, operation);
	let options = mapOpenRouterModelsToLoadOptions(filtered);

	const preferred = getDefaultModelIdForLoadOptions(resource, operation);
	options = ensurePreferredModelInOptions(options, preferred);

	return options;
}
