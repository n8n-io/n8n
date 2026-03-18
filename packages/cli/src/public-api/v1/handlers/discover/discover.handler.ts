import { ApiKeyRepository } from '@n8n/db';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import { License } from '@/license';

import { buildDiscoverResponse } from './discover.service';

const API_KEY_AUDIENCE = 'public-api';

function firstString(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
	return undefined;
}

export = {
	getDiscover: [
		async (
			req: AuthenticatedRequest<
				{},
				{},
				{},
				{ include?: string; resource?: string; operation?: string }
			>,
			res: express.Response,
		): Promise<express.Response> => {
			const apiKey = firstString(req.headers['x-n8n-api-key']);
			if (!apiKey) {
				return res.status(401).json({ message: 'Unauthorized' });
			}

			const apiKeyRecord = await Container.get(ApiKeyRepository).findOne({
				where: { apiKey, audience: API_KEY_AUDIENCE },
				select: { scopes: true },
			});

			if (!apiKeyRecord) {
				return res.status(401).json({ message: 'Unauthorized' });
			}

			const scopesEnabled = Container.get(License).isApiKeyScopesEnabled();
			const includeSchemas = req.query.include === 'schemas';
			const response = await buildDiscoverResponse(apiKeyRecord.scopes, {
				includeSchemas,
				scopesEnabled,
				resource: firstString(req.query.resource),
				operation: firstString(req.query.operation),
			});
			return res.json({ data: response });
		},
	],
};
