import {
	CredentialListPublicDto,
	CredentialPublicDto,
	ListCredentialsQueryDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, CredentialsEntity } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Param,
	ProjectScope,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { buildSharedForCredential } from '@/public-api/v1/handlers/credentials/credentials.utils';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

function toCredentialPublicDto(credential: CredentialsEntity): CredentialPublicDto {
	return {
		id: credential.id,
		name: credential.name,
		type: credential.type,
		isManaged: credential.isManaged,
		isGlobal: credential.isGlobal,
		isResolvable: credential.isResolvable,
		resolvableAllowFallback: credential.resolvableAllowFallback ?? false,
		resolverId: credential.resolverId ?? null,
		createdAt: credential.createdAt.toISOString(),
		updatedAt: credential.updatedAt.toISOString(),
	};
}

function toCredentialListItem(credential: CredentialsEntity) {
	return {
		id: credential.id,
		name: credential.name,
		type: credential.type,
		createdAt: credential.createdAt.toISOString(),
		updatedAt: credential.updatedAt.toISOString(),
		shared: buildSharedForCredential(credential).map((entry) => ({
			...entry,
			createdAt: entry.createdAt.toISOString(),
			updatedAt: entry.updatedAt.toISOString(),
		})),
	};
}

@PublicApiController('/credentials')
export class CredentialsPublicController {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	@Get('/')
	@ApiKeyScope('credential:list')
	@ApiSummary('List credentials')
	@ApiDescription(
		'Retrieve all credentials from your instance. Only available for the instance owner ' +
			'and admin. Credential data (secrets) is not included.',
	)
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialListPublicDto)
	async getCredentials(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListCredentialsQueryDto,
	): Promise<CredentialListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { credentials, count } = await this.credentialsService.getManyAndCount(req.user, {
			listQueryOptions: {
				take: limit,
				skip: offset,
				sortBy: 'createdAt:desc',
				// skip eager-loading shared.project.projectRelations to avoid query fan-out
				relations: ['shared', 'shared.project'],
			},
		});

		return {
			data: credentials.map((credential: CredentialsEntity) => toCredentialListItem(credential)),
			nextCursor: encodeNextCursor({
				offset,
				limit,
				numberOfTotalRecords: count,
			}),
		};
	}

	@Get('/:credentialId')
	@ApiKeyScope('credential:read')
	@ProjectScope('credential:read')
	@ApiSummary('Get credential by ID')
	@ApiDescription('Retrieves a credential by ID. Credential data (secrets) is not included.')
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialPublicDto)
	@ApiErrorResponse(404)
	async getCredential(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId') credentialId: string,
	): Promise<CredentialPublicDto> {
		const credential = await this.credentialsFinderService.findById(credentialId);
		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		return toCredentialPublicDto(credential);
	}
}
