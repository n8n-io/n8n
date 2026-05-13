// TODO(scope): swap to `apiKeyHasScopeWithGlobalScopeFallback({ scope: 'node:read' })`
// once the permissions PR adds `node:read` to the ApiKeyScope union and the role
// scope sets.

import type { AuthenticatedRequest } from '@n8n/db';

import type { PaginatedRequest } from '@/public-api/types';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { validCursor } from '../../shared/middlewares/global.middleware';

type ListEphemeralNodesRequest = AuthenticatedRequest<{}, {}, {}, { nodeType?: string }> &
	PaginatedRequest;

type EphemeralNodesHandlers = {
	listEphemeralNodes: PublicAPIEndpoint<ListEphemeralNodesRequest>;
};

const ephemeralNodesHandlers: EphemeralNodesHandlers = {
	listEphemeralNodes: [
		validCursor,
		async (_req, res) => {
			return res.json({ data: [], nextCursor: null });
		},
	],
};

export = ephemeralNodesHandlers;
