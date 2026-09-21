import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import * as discoverService from '@/public-api/v1/handlers/discover/discover.service';

import { DiscoverPublicController } from '../discover.public.controller';

describe('DiscoverPublicController', () => {
	const controller = new DiscoverPublicController();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeRequest(apiKeyScopes?: string[]) {
		return {
			tokenGrant: apiKeyScopes ? { apiKeyScopes } : undefined,
		} as AuthenticatedRequest;
	}

	it('throws when the token grant is missing', async () => {
		await expect(controller.getDiscover(makeRequest(), {} as Response, {})).rejects.toBeInstanceOf(
			UnauthenticatedError,
		);
	});

	it('returns discover data for the caller scopes and query', async () => {
		const scopes = ['workflow:create'];
		const data = {
			scopes,
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		};
		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue(data);

		await expect(
			controller.getDiscover(makeRequest(scopes), {} as Response, {
				include: 'schemas',
				resource: 'workflow',
				operation: 'create',
			}),
		).resolves.toEqual({ data });
		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: true,
			resource: 'workflow',
			operation: 'create',
		});
	});
});
