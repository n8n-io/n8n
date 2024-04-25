import type { RequestHandler } from 'express';
import { NextFunction, Response } from 'express';
import type {
	INodeListSearchResult,
	INodePropertyOptions,
	ResourceMapperFields,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { Get, Middleware, RestController } from '@/decorators';
import { getBase } from '@/WorkflowExecuteAdditionalData';
import { DynamicNodeParametersService } from '@/services/dynamicNodeParameters.service';
import { DynamicNodeParametersRequest } from '@/requests';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const assertMethodName: RequestHandler = (req, res, next) => {
	const { methodName } = req.query as DynamicNodeParametersRequest.BaseRequest['query'];
	if (!methodName) {
		throw new BadRequestError('Parameter methodName is required.');
	}
	next();
};

@RestController('/dynamic-node-parameters')
export class DynamicNodeParametersController {
	constructor(private readonly service: DynamicNodeParametersService) {}

	@Middleware()
	parseQueryParams(req: DynamicNodeParametersRequest.BaseRequest, _: Response, next: NextFunction) {
		const { credentials, currentNodeParameters, nodeTypeAndVersion } = req.query;
		if (!nodeTypeAndVersion) {
			throw new BadRequestError('Parameter nodeTypeAndVersion is required.');
		}
		if (!currentNodeParameters) {
			throw new BadRequestError('Parameter currentNodeParameters is required.');
		}

		req.params = {
			nodeTypeAndVersion: jsonParse(nodeTypeAndVersion),
			currentNodeParameters: jsonParse(currentNodeParameters),
			credentials: credentials ? jsonParse(credentials) : undefined,
		};

		next();
	}

	/** Returns parameter values which normally get loaded from an external API or get generated dynamically */
	@Get('/options')
	async getOptions(req: DynamicNodeParametersRequest.Options): Promise<INodePropertyOptions[]> {
		const { path, methodName, loadOptions } = req.query;
		const { credentials, currentNodeParameters, nodeTypeAndVersion } = req.params;
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

	@Get('/resource-locator-results', { middlewares: [assertMethodName] })
	async getResourceLocatorResults(
		req: DynamicNodeParametersRequest.ResourceLocatorResults,
	): Promise<INodeListSearchResult | undefined> {
		const { path, methodName, filter, paginationToken } = req.query;
		const { credentials, currentNodeParameters, nodeTypeAndVersion } = req.params;
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

	@Get('/resource-mapper-fields', { middlewares: [assertMethodName] })
	async getResourceMappingFields(
		req: DynamicNodeParametersRequest.ResourceMapperFields,
	): Promise<ResourceMapperFields | undefined> {
		const { path, methodName } = req.query;
		const { credentials, currentNodeParameters, nodeTypeAndVersion } = req.params;
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
