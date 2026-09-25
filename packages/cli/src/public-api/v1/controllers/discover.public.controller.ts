import { DiscoverPublicDto, DiscoverQueryPublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { buildDiscoverResponse } from '@/public-api/v1/handlers/discover/discover.service';

@PublicApiController('/discover')
export class DiscoverPublicController {
	@Get('/')
	@ApiSummary('Discover available API capabilities')
	@ApiDescription(
		"Returns a filtered capability map based on the caller's API key scopes. Each resource includes the operations and endpoints accessible to the authenticated API key. Use query parameters to narrow the response.",
	)
	@ApiTags(['Discover'])
	@ApiResponse(200, DiscoverPublicDto)
	async getDiscover(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: DiscoverQueryPublicDto,
	): Promise<DiscoverPublicDto> {
		const scopes = req.tokenGrant?.apiKeyScopes;
		if (!scopes) {
			throw new UnauthenticatedError('Unauthorized');
		}

		return {
			data: await buildDiscoverResponse(scopes, {
				includeSchemas: query.include === 'schemas',
				resource: query.resource,
				operation: query.operation,
			}),
		};
	}
}
