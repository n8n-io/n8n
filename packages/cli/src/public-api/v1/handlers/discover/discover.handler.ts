import { ApiKeyRepository } from '@n8n/db';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import { buildDiscoverResponse } from './discover.service';

const API_KEY_AUDIENCE = 'public-api';

export = {
	getDiscover: [
		async (
			req: AuthenticatedRequest<{}, {}, {}, { include?: string }>,
			res: express.Response,
		): Promise<express.Response> => {
			const apiKeyHeader = req.headers['x-n8n-api-key'] as string;

			const apiKeyRecord = await Container.get(ApiKeyRepository).findOne({
				where: { apiKey: apiKeyHeader, audience: API_KEY_AUDIENCE },
				select: { scopes: true },
			});

			if (!apiKeyRecord) {
				return res.status(401).json({ message: 'Unauthorized' });
			}

			const includeSchemas = req.query.include === 'schemas';
			const response = await buildDiscoverResponse(apiKeyRecord.scopes, { includeSchemas });
			return res.json({ data: response });
		},
	],
};
