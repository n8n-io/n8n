import {
	CredentialListPublicDto,
	CredentialPublicDto,
	DeleteCredentialPublicDto,
	ListCredentialsQueryDto,
	TransferCredentialPublicDto,
	credentialIdParamSchema,
} from '@n8n/api-types';
import type { AuthenticatedRequest, CredentialsEntity } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Param,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { buildSharedForCredential } from '@/public-api/v1/handlers/credentials/credentials.utils';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

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

/** The delete response adds `usageScope` to the standard credential fields. See DeleteCredentialPublicDto. */
function toDeleteCredentialPublicDto(credential: CredentialsEntity): DeleteCredentialPublicDto {
	return {
		...toCredentialPublicDto(credential),
		usageScope: credential.usageScope,
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
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
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
		@Param('credentialId', credentialIdParamSchema) credentialId: string,
	): Promise<CredentialPublicDto> {
		const credential = await this.credentialsFinderService.findById(credentialId);
		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		return toCredentialPublicDto(credential);
	}

	@Delete('/:credentialId')
	@ApiKeyScope('credential:delete')
	@ProjectScope('credential:delete')
	@ApiSummary('Delete credential by ID')
	@ApiDescription(
		'Deletes a credential from your instance. You must be the owner of the credentials',
	)
	@ApiTags(['Credential'])
	@ApiResponse(200, DeleteCredentialPublicDto)
	@ApiErrorResponse(404)
	async deleteCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId', credentialIdParamSchema) credentialId: string,
	): Promise<DeleteCredentialPublicDto> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:delete'],
		);

		if (!credential) {
			throw new NotFoundError('Not Found');
		}

		await this.credentialsService.delete(req.user, credentialId);

		return toDeleteCredentialPublicDto(credential);
	}

	@Put('/:credentialId/transfer')
	@ApiKeyScope('credential:move')
	@ProjectScope('credential:move')
	@ApiSummary('Transfer a credential to another project.')
	@ApiDescription('Transfer a credential to another project.')
	@ApiTags(['Credential'])
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async transferCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId', credentialIdParamSchema) credentialId: string,
		@Body body: TransferCredentialPublicDto,
	): Promise<void> {
		await this.enterpriseCredentialsService.transferOne(
			req.user,
			credentialId,
			body.destinationProjectId,
		);
	}
}
