import { ExecuteEphemeralNodeRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeParameters } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import type { PaginatedRequest } from '@/public-api/types';

import { toInlineRequest, toPublicResponse } from './ephemeral-nodes.mapper';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	validCursor,
} from '../../shared/middlewares/global.middleware';

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

			const projectId = (
				await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(req.user.id)
			).id;

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
		validCursor,
		async (_req, res) => {
			return res.json({ data: [], nextCursor: null });
		},
	],
};

export = ephemeralNodesHandlers;
