import { ApiKeyRepository, type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import { buildDiscoverResponse } from './discover.service';
import type { PublicAPIEndpoint } from '../../shared/handler.types';

const API_KEY_AUDIENCE = 'public-api';

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

type DiscoverHandlers = {
	getDiscover: PublicAPIEndpoint<GetDiscoverRequest>;
};

const discoverHandlers: DiscoverHandlers = {
	getDiscover: [
		async (req, res) => {
			const apiKey = firstString(req.headers['x-n8n-api-key']);
			if (!apiKey) {
				throw new UnauthenticatedError('Unauthorized');
			}

			const apiKeyRecord = await Container.get(ApiKeyRepository).findOne({
				where: { apiKey, audience: API_KEY_AUDIENCE },
				select: { scopes: true },
			});

			if (!apiKeyRecord) {
				throw new UnauthenticatedError('Unauthorized');
			}

			const includeSchemas = req.query.include === 'schemas';
			const response = await buildDiscoverResponse(apiKeyRecord.scopes, {
				includeSchemas,
				resource: firstString(req.query.resource),
				operation: firstString(req.query.operation),
			});
			return res.json({ data: response });
		},
	],
};

export = discoverHandlers;
