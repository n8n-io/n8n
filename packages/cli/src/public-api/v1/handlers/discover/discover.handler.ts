import type { AuthenticatedRequest } from '@n8n/db';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import { buildDiscoverResponse } from './discover.service';
import type { PublicAPIEndpoint } from '../../shared/handler.types';

type GetDiscoverRequest = AuthenticatedRequest<
	{},
	{},
	{},
	{ include?: string; resource?: string; operation?: string }
>;

function firstString(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
	return undefined;
}

function resolveSpecUrl(req: GetDiscoverRequest): string {
	const publicApiBasePath = req.baseUrl || '/api/v1';
	return `${publicApiBasePath}/openapi.yml`;
}

type DiscoverHandlers = {
	getDiscover: PublicAPIEndpoint<GetDiscoverRequest>;
};

const discoverHandlers: DiscoverHandlers = {
	getDiscover: [
		async (req, res) => {
			const scopes = req.tokenGrant?.apiKeyScopes;
			if (!scopes) {
				throw new UnauthenticatedError('Unauthorized');
			}

			const includeSchemas = req.query.include === 'schemas';
			const response = await buildDiscoverResponse(scopes, {
				includeSchemas,
				resource: firstString(req.query.resource),
				operation: firstString(req.query.operation),
				specUrl: resolveSpecUrl(req),
			});
			return res.json({ data: response });
		},
	],
};

export = discoverHandlers;
