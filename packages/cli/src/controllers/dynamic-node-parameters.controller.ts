import type { INodePropertyOptions, NodeParameterValueType } from 'n8n-workflow';

import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { DynamicNodeParametersRequest } from '@/requests';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

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
				loadOptions,
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

	@Post('/action-result')
	async getActionResult(
		req: DynamicNodeParametersRequest.ActionResult,
	): Promise<NodeParameterValueType> {
		const { currentNodeParameters, nodeTypeAndVersion, path, credentials, handler, payload } =
			req.body;

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		if (handler) {
			return await this.service.getActionResult(
				handler,
				path,
				additionalData,
				nodeTypeAndVersion,
				currentNodeParameters,
				payload,
				credentials,
			);
		}

		return;
	}
}
