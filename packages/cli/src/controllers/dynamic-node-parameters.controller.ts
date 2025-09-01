import {
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
	ActionResultRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController, Body } from '@n8n/decorators';
import type { INodePropertyOptions, NodeParameterValueType } from 'n8n-workflow';

import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { userHasScopes } from '@/permissions.ee/check-access';

@RestController('/dynamic-node-parameters')
export class DynamicNodeParametersController {
	constructor(private readonly service: DynamicNodeParametersService) {}

	@Post('/options')
	async getOptions(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: OptionsRequestDto,
	): Promise<INodePropertyOptions[]> {
		const {
			credentials,
			currentNodeParameters,
			nodeTypeAndVersion,
			path,
			methodName,
			loadOptions,
		} = payload;

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
	async getResourceLocatorResults(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ResourceLocatorRequestDto,
	) {
		const {
			path,
			methodName,
			filter,
			paginationToken,
			credentials,
			currentNodeParameters,
			nodeTypeAndVersion,
			projectId,
		} = payload;

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		if (projectId) {
			if (await userHasScopes(req.user, ['dataStore:listProject'], false, { projectId })) {
				// Project ID is currently only added on the additionalData if the user
				// has data store listing permission for that project. We should consider
				// turning this into a more general check, but as of now data stores are
				// the only nodes with project specific resource locators where we want to ensure
				// that only data stores belonging to their respective projects are shown.
				additionalData.dataStoreProjectId = projectId;
			}
		}

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
	async getResourceMappingFields(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ResourceMapperFieldsRequestDto,
	) {
		const { path, methodName, credentials, currentNodeParameters, nodeTypeAndVersion } = payload;

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

	@Post('/local-resource-mapper-fields')
	async getLocalResourceMappingFields(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ResourceMapperFieldsRequestDto,
	) {
		const { path, methodName, currentNodeParameters, nodeTypeAndVersion } = payload;

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		return await this.service.getLocalResourceMappingFields(
			methodName,
			path,
			additionalData,
			nodeTypeAndVersion,
		);
	}

	@Post('/action-result')
	async getActionResult(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ActionResultRequestDto,
	): Promise<NodeParameterValueType> {
		const {
			currentNodeParameters,
			nodeTypeAndVersion,
			path,
			credentials,
			handler,
			payload: actionPayload,
		} = payload;

		const additionalData = await getBase(req.user.id, currentNodeParameters);

		return await this.service.getActionResult(
			handler,
			path,
			additionalData,
			nodeTypeAndVersion,
			currentNodeParameters,
			actionPayload,
			credentials,
		);
	}
}
