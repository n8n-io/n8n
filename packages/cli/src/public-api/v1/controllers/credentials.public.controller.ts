import {
	CredentialListPublicDto,
	CredentialPublicDto,
	ListCredentialsQueryDto,
	ShareCredentialPublicDto,
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
	Get,
	Licensed,
	Param,
	ProjectScope,
	Put,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { apiKeyScopesSatisfy } from '@/public-api/public-api-route-resolver';
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
		@Param('credentialId') credentialId: string,
	): Promise<CredentialPublicDto> {
		const credential = await this.credentialsFinderService.findById(credentialId);
		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		return toCredentialPublicDto(credential);
	}

	@Put('/:credentialId/share')
	@Licensed('feat:sharing')
	@ApiKeyScope({ anyOf: ['credential:share', 'credential:unshare'] })
	@ProjectScope('credential:read')
	@ApiSummary('Share a credential with projects')
	@ApiDescription(
		'Replaces the set of projects a credential is shared with. Projects in `shareWithIds` that the credential is not yet shared with are added, and projects it is currently shared with that are absent from `shareWithIds` are removed. The owning project is unaffected. Adding projects requires the `credential:share` scope, removing them requires `credential:unshare`.',
	)
	@ApiTags(['Credential'])
	@ApiResponse(204)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	async shareCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId') credentialId: string,
		@Body body: ShareCredentialPublicDto,
	): Promise<void> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:read'],
		);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		const diff = this.enterpriseCredentialsService.getSharedWithProjectsDiff(
			credential,
			body.shareWithIds,
		);

		// `@ApiKeyScope` only gates entry with `anyOf`, so each direction of the diff
		// is authorized against the API key separately here.
		const apiKeyScopes = req.tokenGrant?.apiKeyScopes ?? [];

		if (diff.toShare.length > 0 && !apiKeyScopesSatisfy(apiKeyScopes, 'credential:share')) {
			throw new ForbiddenError();
		}

		if (diff.toUnshare.length > 0 && !apiKeyScopesSatisfy(apiKeyScopes, 'credential:unshare')) {
			throw new ForbiddenError();
		}

		await this.enterpriseCredentialsService.setSharedWithProjects(req.user, credential, diff);
	}
}
