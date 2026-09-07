import {
	credentialIdParamSchema,
	CreateCredentialPublicDto,
	CredentialListPublicDto,
	CredentialPublicDto,
	ListCredentialsQueryDto,
	UpdateCredentialPublicDto,
} from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { AuthenticatedRequest, CredentialsEntity, ICredentialsDb, User } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import {
	assertKnownCredentialType,
	buildSharedForCredential,
	validateCredentialData,
} from '@/public-api/v1/handlers/credentials/credentials.utils';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

/**
 * The fields `toCredentialPublicDto` reads. A plain `CredentialsEntity` satisfies this, and so
 * does the object `CredentialsService.createUnmanagedCredential` returns, which carries an extra
 * `scopes` field and omits `shared` (both irrelevant to the public response).
 */
type CredentialPublicDtoSource = Pick<
	CredentialsEntity,
	| 'id'
	| 'name'
	| 'type'
	| 'isManaged'
	| 'isGlobal'
	| 'isResolvable'
	| 'resolvableAllowFallback'
	| 'resolverId'
	| 'createdAt'
	| 'updatedAt'
>;

function toCredentialPublicDto(credential: CredentialPublicDtoSource): CredentialPublicDto {
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
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly licenseState: LicenseState,
		private readonly eventService: EventService,
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

	@Post('/')
	@ApiKeyScope('credential:create')
	@ApiSummary('Create a credential')
	@ApiDescription('Creates a credential that can be used by nodes of the specified type.')
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialPublicDto)
	@ApiErrorResponse(404)
	async createCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateCredentialPublicDto,
	): Promise<CredentialPublicDto> {
		assertKnownCredentialType(this.credentialTypes, body.type);
		validateCredentialData(this.credentialsHelper, body.type, body.data);

		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				type: body.type,
				name: body.name,
				data: body.data,
				projectId: body.projectId,
				isResolvable: body.isResolvable,
				usageScope: 'project',
			},
			req.user,
		);

		const project = await this.credentialsService.findCredentialOwningProject(credential.id);

		this.eventService.emit('credentials-created', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
			credentialName: credential.name,
			publicApi: true,
			projectId: project?.id,
			projectType: project?.type,
			isDynamic: credential.isResolvable ?? false,
			jweEnabled: body.data.jweEnabled === true,
		});

		return toCredentialPublicDto(credential);
	}

	@Patch('/:credentialId')
	@ApiKeyScope('credential:update')
	@ProjectScope('credential:update')
	@ApiSummary('Update credential by ID')
	@ApiDescription('Updates an existing credential. You must be the owner of the credential.')
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialPublicDto)
	@ApiErrorResponse(404)
	async updateCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId') credentialId: string,
		@Body body: UpdateCredentialPublicDto,
	): Promise<CredentialPublicDto> {
		if (body.type !== undefined) {
			assertKnownCredentialType(this.credentialTypes, body.type);
		}

		const existingCredential = await this.credentialsFinderService.findById(credentialId, {
			includeSharedProject: true,
		});
		if (!existingCredential) {
			throw new NotFoundError('Credential not found');
		}

		if (body.data !== undefined) {
			const effectiveType = body.type ?? existingCredential.type;
			validateCredentialData(this.credentialsHelper, effectiveType, body.data, {
				partialData: body.isPartialData === true,
			});
		} else if (body.type !== undefined && body.type !== existingCredential.type) {
			throw new BadRequestError(
				'req.body.data is required when changing credential type. The existing data cannot ' +
					'be used with the new type.',
			);
		}

		if (existingCredential.isManaged) {
			throw new BadRequestError('Managed credentials cannot be updated.');
		}

		if (body.isGlobal !== undefined && body.isGlobal !== existingCredential.isGlobal) {
			if (!this.licenseState.isSharingLicensed()) {
				throw new ForbiddenError('You are not licensed for sharing credentials');
			}

			if (!hasGlobalScope(req.user, 'credential:shareGlobally')) {
				throw new ForbiddenError(
					'You do not have permission to change global sharing for credentials',
				);
			}
		}

		if (
			body.isResolvable !== undefined &&
			body.isResolvable !== Boolean(existingCredential.isResolvable)
		) {
			const ownerSharing = existingCredential.shared?.find(
				(sharing) => sharing.role === 'credential:owner',
			);
			if (body.isResolvable) {
				this.credentialsService.ensureEndUserCredentialAllowedInProject(ownerSharing?.project);
			}
			await this.credentialsService.ensureCanManageEndUserCredential(
				req.user,
				ownerSharing?.projectId,
			);
		}

		const isChangingAuthType = body.type !== undefined && body.type !== existingCredential.type;
		const isTogglingToPrivate = Boolean(body.isResolvable) && !existingCredential.isResolvable;

		const { updatePayload, decryptedDataForDeps } = await this.buildUpdatePayload({
			user: req.user,
			existingCredential,
			body,
			clearOauthTokenData: isTogglingToPrivate || isChangingAuthType,
		});

		const updatedCredential = await this.credentialsService.update(
			credentialId,
			updatePayload,
			decryptedDataForDeps,
		);

		if (!updatedCredential) {
			throw new NotFoundError('Credential not found');
		}

		return toCredentialPublicDto(updatedCredential);
	}

	/**
	 * Builds the row to persist for a credential update. When `data` is provided, the payload is
	 * re-encrypted through `prepareUpdateData` (which honours `isPartialData`) and
	 * `createEncryptedData`; otherwise the existing encrypted data is kept as-is.
	 */
	private async buildUpdatePayload({
		user,
		existingCredential,
		body,
		clearOauthTokenData,
	}: {
		user: User;
		existingCredential: CredentialsEntity;
		body: UpdateCredentialPublicDto;
		clearOauthTokenData: boolean;
	}): Promise<{
		updatePayload: ICredentialsDb;
		decryptedDataForDeps?: ICredentialDataDecryptedObject;
	}> {
		let updatePayload: ICredentialsDb;
		let decryptedDataForDeps: ICredentialDataDecryptedObject | undefined;

		if (body.data) {
			const preparedCredentialData = await this.credentialsService.prepareUpdateData(
				user,
				{
					name: body.name ?? existingCredential.name,
					type: body.type ?? existingCredential.type,
					data: body.data as unknown as ICredentialDataDecryptedObject,
				},
				existingCredential,
				{
					dataMerge: body.isPartialData ? 'partial' : 'replace',
					clearOauthTokenData,
				},
			);

			decryptedDataForDeps =
				preparedCredentialData.data as unknown as ICredentialDataDecryptedObject;

			updatePayload = await this.credentialsService.createEncryptedData({
				id: existingCredential.id,
				name: preparedCredentialData.name,
				type: preparedCredentialData.type,
				data: decryptedDataForDeps,
			});
		} else {
			updatePayload = {
				id: existingCredential.id,
				name: body.name ?? existingCredential.name,
				type: body.type ?? existingCredential.type,
				data: existingCredential.data,
				createdAt: existingCredential.createdAt,
				updatedAt: existingCredential.updatedAt,
			};
		}

		if (body.isGlobal !== undefined) {
			updatePayload.isGlobal = body.isGlobal;
		}
		if (body.isResolvable !== undefined) {
			updatePayload.isResolvable = body.isResolvable;
		}
		updatePayload.updatedAt = new Date();

		return { updatePayload, decryptedDataForDeps };
	}
}
