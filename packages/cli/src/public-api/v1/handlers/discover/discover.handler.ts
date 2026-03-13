import { ApiKeyRepository } from '@n8n/db';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import { buildDiscoverResponse } from './discover.service';

const API_KEY_AUDIENCE = 'public-api';

export = {
	getDiscover: [
		async (
			req: AuthenticatedRequest<{}, {}, {}, { include?: string; resource?: string; op?: string }>,
			res: express.Response,
		): Promise<express.Response> => {
			const rawHeader = req.headers['x-n8n-api-key'];
			const apiKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
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

			const includeSchemas = req.query.include === 'schemas';
			const response = await buildDiscoverResponse(apiKeyRecord.scopes, {
				includeSchemas,
				resource: req.query.resource,
				operation: req.query.op,
			});
			return res.json({ data: response });
		},
	],
};
