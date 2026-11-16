import {
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
	ActionResultRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController, Body } from '@n8n/decorators';
import { ExecutionContextService } from 'n8n-core';
import type { IExecutionContext, INodePropertyOptions, NodeParameterValueType } from 'n8n-workflow';

import { AuthService } from '@/auth/auth.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

@RestController('/dynamic-node-parameters')
export class DynamicNodeParametersController {
	constructor(
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly authService: AuthService,
		private readonly executionContextService: ExecutionContextService,
	) {}

	/**
	 * Seals the requesting user's own identity into an execution context, so that
	 * dropdowns backed by an end-user credential resolve against the connection that
	 * user already made. These routes run in mode `internal`, which skips dynamic
	 * credential resolution unless the context carries a credential context — without
	 * one the node falls back to static data that holds no per-user token.
	 *
	 * Returns `undefined` for callers without an auth cookie (API keys, for instance),
	 * which keeps them on the existing static-data behaviour rather than failing them.
	 */
	private async buildExecutionContext(
		req: AuthenticatedRequest,
	): Promise<IExecutionContext | undefined> {
		const authCookie = this.authService.getCookieToken(req);
		if (authCookie === undefined) return undefined;

		// Request-bound rather than `manual-execution`: the browser id, method and endpoint
		// re-checked at resolution time are the ones this request already authenticated
		// with, so the check cannot newly fail while keeping the cookie usable only for the
		// request it came in on.
		const credentials = await this.executionContextService.buildRequestBoundCredentials(
			authCookie,
			{
				method: this.authService.getMethod(req),
				endpoint: this.authService.getEndpoint(req),
				browserId: this.authService.getBrowserId(req),
			},
		);

		return { version: 1, establishedAt: Date.now(), source: 'internal', credentials };
	}

	@Post('/options')
	async getOptions(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: OptionsRequestDto,
	): Promise<INodePropertyOptions[]> {
		await this.dynamicNodeParametersService.refineResourceIds(req.user, payload);

		const {
			credentials,
			currentNodeParameters,
			nodeTypeAndVersion,
			path,
			methodName,
			loadOptions,
			projectId,
		} = payload;

		const additionalData = await getBase({
			userId: req.user.id,
			projectId,
			currentNodeParameters,
		});
		additionalData.dataTableProjectId = projectId;
		additionalData.executionContext = await this.buildExecutionContext(req);

		if (methodName) {
			return await this.dynamicNodeParametersService.getOptionsViaMethodName(
				methodName,
				path,
				additionalData,
				nodeTypeAndVersion,
				currentNodeParameters,
				credentials,
			);
		}

		if (loadOptions) {
			return await this.dynamicNodeParametersService.getOptionsViaLoadOptionsByPath(
				path,
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
		await this.dynamicNodeParametersService.refineResourceIds(req.user, payload);

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

		const additionalData = await getBase({
			userId: req.user.id,
			projectId,
			currentNodeParameters,
		});
		additionalData.dataTableProjectId = projectId;
		additionalData.executionContext = await this.buildExecutionContext(req);

		return await this.dynamicNodeParametersService.getResourceLocatorResults(
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
		await this.dynamicNodeParametersService.refineResourceIds(req.user, payload);

		const { path, methodName, credentials, currentNodeParameters, nodeTypeAndVersion, projectId } =
			payload;

		const additionalData = await getBase({
			userId: req.user.id,
			projectId,
			currentNodeParameters,
		});
		additionalData.dataTableProjectId = projectId;
		additionalData.executionContext = await this.buildExecutionContext(req);

		return await this.dynamicNodeParametersService.getResourceMappingFields(
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
		await this.dynamicNodeParametersService.refineResourceIds(req.user, payload);

		const { path, methodName, currentNodeParameters, nodeTypeAndVersion, projectId } = payload;

		const additionalData = await getBase({
			userId: req.user.id,
			currentNodeParameters,
			projectId,
		});

		// No execution context here: local resource mapping reads a sub-workflow's own
		// inputs and never touches a credential.
		return await this.dynamicNodeParametersService.getLocalResourceMappingFields(
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
		await this.dynamicNodeParametersService.refineResourceIds(req.user, payload);

		const {
			currentNodeParameters,
			nodeTypeAndVersion,
			path,
			credentials,
			handler,
			payload: actionPayload,
			projectId,
		} = payload;

		const additionalData = await getBase({
			userId: req.user.id,
			projectId,
			currentNodeParameters,
		});
		additionalData.executionContext = await this.buildExecutionContext(req);

		return await this.dynamicNodeParametersService.getActionResult(
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
