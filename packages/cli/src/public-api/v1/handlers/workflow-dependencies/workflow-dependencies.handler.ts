import type { DependencyResourceType } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import type { Response, NextFunction } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';

import type { WorkflowDependencyRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiCompositeScope } from '../../shared/middlewares/global.middleware';

const SCOPE_BY_RESOURCE: Record<string, ApiKeyScope> = {
	workflow: 'workflow:read',
	credential: 'credential:read',
	dataTable: 'dataTable:list',
};

const VALID_RESOURCE_TYPES = new Set<string>(['workflow', 'credential', 'dataTable']);

const enforceDynamicScope = (
	req: WorkflowDependencyRequest.PostBody,
	res: Response,
	next: NextFunction,
): void => {
	const resourceType = req.body?.resourceType as string | undefined;

	if (!resourceType || !SCOPE_BY_RESOURCE[resourceType]) {
		res.status(400).json({ message: 'Invalid or missing resourceType in request body' });
		return;
	}

	const requiredScope = SCOPE_BY_RESOURCE[resourceType];

	if (!req.tokenGrant?.apiKeyScopes?.includes(requiredScope)) {
		res.status(403).json({ message: 'Forbidden' });
		return;
	}

	next();
};

type WorkflowDependenciesHandlers = {
	getResourceDependencyCounts: PublicAPIEndpoint<WorkflowDependencyRequest.PostBody>;
	getResourceDependencies: PublicAPIEndpoint<WorkflowDependencyRequest.PostBody>;
};

const workflowDependenciesHandlers: WorkflowDependenciesHandlers = {
	getResourceDependencyCounts: [
		publicApiCompositeScope('workflow:read,credential:read,dataTable:list'),
		enforceDynamicScope,
		async (req, res) => {
			try {
				const { resourceIds, resourceType } = req.body;

				if (!Array.isArray(resourceIds) || resourceIds.length === 0 || resourceIds.length > 100) {
					throw new BadRequestError(
						'resourceIds must be a non-empty array with at most 100 entries',
					);
				}

				if (!VALID_RESOURCE_TYPES.has(resourceType)) {
					throw new BadRequestError('resourceType must be one of: workflow, credential, dataTable');
				}

				const result = await Container.get(WorkflowDependencyQueryService).getDependencyCounts(
					resourceIds,
					resourceType as DependencyResourceType,
					req.user,
				);

				return res.json(result);
			} catch (error) {
				if (error instanceof BadRequestError || error instanceof ForbiddenError) {
					throw error;
				}
				throw new BadRequestError(
					error instanceof Error ? error.message : 'Failed to retrieve dependency counts',
				);
			}
		},
	],

	getResourceDependencies: [
		publicApiCompositeScope('workflow:read,credential:read,dataTable:list'),
		enforceDynamicScope,
		async (req, res) => {
			try {
				const { resourceIds, resourceType } = req.body;

				if (!Array.isArray(resourceIds) || resourceIds.length === 0 || resourceIds.length > 100) {
					throw new BadRequestError(
						'resourceIds must be a non-empty array with at most 100 entries',
					);
				}

				if (!VALID_RESOURCE_TYPES.has(resourceType)) {
					throw new BadRequestError('resourceType must be one of: workflow, credential, dataTable');
				}

				const result = await Container.get(WorkflowDependencyQueryService).getResourceDependencies(
					resourceIds,
					resourceType as DependencyResourceType,
					req.user,
				);

				return res.json(result);
			} catch (error) {
				if (error instanceof BadRequestError || error instanceof ForbiddenError) {
					throw error;
				}
				throw new BadRequestError(
					error instanceof Error ? error.message : 'Failed to retrieve resource dependencies',
				);
			}
		},
	],
};

export = workflowDependenciesHandlers;
