import type { INodePropertyOptions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { Post, RestController } from '@/decorators';
import { getBase } from '@/WorkflowExecuteAdditionalData';
import { DynamicNodeParametersService } from '@/services/dynamicNodeParameters.service';
import { DynamicNodeParametersRequest } from '@/requests';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@RestController('/dynamic-node-parameters')
export class DynamicNodeParametersController {
	constructor(private readonly service: DynamicNodeParametersService) {}

	@Post('/options')
	async getOptions(req: DynamicNodeParametersRequest.Options): Promise<INodePropertyOptions[]> {
		const {
			credentials,
			currentNodeParameters,
			nodeTypeAndVersion,
			path,
			methodName,
			loadOptions,
		} = req.body;

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		if (methodName) {
			return await this.service.getOptionsViaMethodName(
				methodName,
				path,
				additionalData,
				nodeTypeAndVersion,
				currentNodeParameters,
				credentials,
			);
		}

		if (loadOptions) {
			return await this.service.getOptionsViaLoadOptions(
				jsonParse(loadOptions),
				additionalData,
				nodeTypeAndVersion,
				currentNodeParameters,
				credentials,
			);
		}

		return [];
	}

	@Post('/resource-locator-results')
	async getResourceLocatorResults(req: DynamicNodeParametersRequest.ResourceLocatorResults) {
		const {
			path,
			methodName,
			filter,
			paginationToken,
			credentials,
			currentNodeParameters,
			nodeTypeAndVersion,
		} = req.body;

		if (!methodName) throw new BadRequestError('Missing `methodName` in request body');

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		return await this.service.getResourceLocatorResults(
			methodName,
			path,
			additionalData,
			nodeTypeAndVersion,
			currentNodeParameters,
			credentials,
			filter,
			paginationToken,
		);
	}

	@Post('/resource-mapper-fields')
	async getResourceMappingFields(req: DynamicNodeParametersRequest.ResourceMapperFields) {
		const { path, methodName, credentials, currentNodeParameters, nodeTypeAndVersion } = req.body;

		if (!methodName) throw new BadRequestError('Missing `methodName` in request body');

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		return await this.service.getResourceMappingFields(
			methodName,
			path,
			additionalData,
			nodeTypeAndVersion,
			currentNodeParameters,
			credentials,
		);
	}
}
