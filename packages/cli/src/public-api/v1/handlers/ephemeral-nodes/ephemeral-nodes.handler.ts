import { ExecuteEphemeralNodeRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeParameters } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import type { PaginatedRequest } from '@/public-api/types';
import { ProjectService } from '@/services/project.service.ee';

import { isNodeTypeAllowlisted } from './ephemeral-nodes.allowlist';
import {
	mapToEphemeralNodeList,
	toInlineRequest,
	toPublicResponse,
} from './ephemeral-nodes.mapper';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { paginateArray } from '../../shared/services/pagination.service';

type EphemeralNodesHandlers = {
	executeEphemeralNode: PublicAPIEndpoint<AuthenticatedRequest>;
	listEphemeralNodes: PublicAPIEndpoint<ListEphemeralNodesRequest>;
};

type ListEphemeralNodesRequest = AuthenticatedRequest<{}, {}, {}, { nodeType?: string }> &
	PaginatedRequest;

const ephemeralNodesHandlers: EphemeralNodesHandlers = {
	executeEphemeralNode: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'ephemeralNode:execute' }),
		async (req, res) => {
			const parsed = ExecuteEphemeralNodeRequestDto.safeParse(req.body);
			if (!parsed.success) {
				throw new BadRequestError(parsed.error.errors[0].message);
			}
			const dto = parsed.data;

			// The public API only exposes a curated subset of nodes; refuse
			// anything outside that set before doing project lookups or hitting
			// the shared executor (which is also used by the agent runtime and
			// applies looser, tool-oriented criteria).
			if (!isNodeTypeAllowlisted(dto.nodeType)) {
				throw new BadRequestError(`Node type "${dto.nodeType}" is not available for execution`);
			}

			let projectId: string;
			if (dto.projectId) {
				const project = await Container.get(ProjectService).getProjectWithScope(
					req.user,
					dto.projectId,
					['workflow:execute'],
				);
				if (!project) {
					throw new NotFoundError('Project not found');
				}
				projectId = project.id;
			} else {
				projectId = (
					await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(req.user.id)
				).id;
			}

			const executor = Container.get(EphemeralNodeExecutor);

			try {
				executor.validateNodeForExecution(
					dto.nodeType,
					dto.nodeTypeVersion,
					dto.nodeParameters as INodeParameters,
				);
			} catch (error) {
				throw new BadRequestError(error instanceof Error ? error.message : String(error));
			}

			const result = await executor.executeInline(toInlineRequest(dto, projectId));

			return res.json(toPublicResponse(result));
		},
	],
	listEphemeralNodes: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'ephemeralNode:read' }),
		validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100, nodeType } = req.query;

			const { nodes } = await Container.get(LoadNodesAndCredentials).collectTypes();
			const catalogue = mapToEphemeralNodeList(nodes, { nodeType });

			return res.json(paginateArray(catalogue, { offset, limit }));
		},
	],
};

export = ephemeralNodesHandlers;
