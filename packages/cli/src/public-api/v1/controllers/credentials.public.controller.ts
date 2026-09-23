import {
	credentialIdParamSchema,
	credentialTypeNameParamSchema,
	CreateCredentialPublicDto,
	CredentialListPublicDto,
	CredentialPublicDto,
	CredentialSchemaPublicDto,
	CredentialTestPublicDto,
	DeleteCredentialPublicDto,
	ListCredentialsQueryDto,
	UpdateCredentialPublicDto,
	TransferCredentialPublicDto,
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
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import {
	assertValidUpdateProperties,
	buildSharedForCredential,
	toJsonSchema,
	validateCredentialData,
} from '@/public-api/v1/handlers/credentials/credentials.utils';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

/**
 * Allows us to type the input to `toCredentialPublicDto` and have the return type of each service method satisfy that input type.
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

/** The delete response adds `usageScope` to the standard credential fields. Carry over from legacy EOV handler. */
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
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly licenseState: LicenseState,
		private readonly eventService: EventService,
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

	@Post('/')
	@ApiKeyScope('credential:create')
	@ApiSummary('Create a credential')
	@ApiDescription('Creates a credential that can be used by nodes of the specified type.')
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async createCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateCredentialPublicDto,
	): Promise<CredentialPublicDto> {
		this.assertKnownCredentialType(body.type);
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
			{ id: body.id },
		);

		const project = await this.credentialsService.findCredentialOwningProject(credential.id);

		this.eventService.emit('credentials-created', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
			credentialName: credential.name,
			credentialDescriptionLength: credential.description?.length ?? 0,
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
		@Param('credentialId', credentialIdParamSchema) credentialId: string,
		@Body({ required: true }) body: UpdateCredentialPublicDto,
	): Promise<CredentialPublicDto> {
		if (body.type !== undefined) {
			this.assertKnownCredentialType(body.type);
		}

		const existingCredential = await this.credentialsFinderService.findById(credentialId, {
			includeSharedProject: true,
		});
		if (!existingCredential) {
			throw new NotFoundError('Credential not found');
		}

		assertValidUpdateProperties(this.credentialsHelper, existingCredential, body);

		if (existingCredential.isManaged) {
			throw new BadRequestError('Managed credentials cannot be updated.');
		}

		if (body.isGlobal !== undefined && body.isGlobal !== existingCredential.isGlobal) {
			if (!this.licenseState.isSharingLicensed()) {
				throw new ForbiddenError('You are not licensed for sharing credentials');
			}

			const canShareGlobally = hasGlobalScope(req.user, 'credential:shareGlobally');
			if (!canShareGlobally) {
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

	private assertKnownCredentialType(type: string): void {
		try {
			this.credentialTypes.getByName(type);
		} catch {
			throw new BadRequestError('req.body.type is not a known type');
		}
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

	@Delete('/:credentialId')
	@ApiKeyScope('credential:delete')
	@ProjectScope('credential:delete')
	@ApiSummary('Delete credential by ID')
	@ApiDescription(
		'Deletes a credential from your instance. You must be the owner of the credential.',
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

	@Post('/:credentialId/test')
	@ApiKeyScope('credential:read')
	@ProjectScope('credential:read')
	@ApiSummary('Test credential by ID')
	@ApiDescription('Tests a credential by ID using the stored credential data.')
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialTestPublicDto)
	@ApiErrorResponse(404)
	async testCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId', credentialIdParamSchema) credentialId: string,
	): Promise<CredentialTestPublicDto> {
		try {
			return await this.credentialsService.testById(req.user, credentialId);
		} catch (error) {
			if (error instanceof CredentialNotFoundError) {
				throw new NotFoundError(error.message);
			}

			throw error;
		}
	}

	@Get('/schema/:credentialTypeName')
	@ApiSummary('Show credential data schema')
	@ApiTags(['Credential'])
	@ApiResponse(200, CredentialSchemaPublicDto)
	@ApiErrorResponse(404)
	async getCredentialType(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialTypeName', credentialTypeNameParamSchema) credentialTypeName: string,
	): Promise<CredentialSchemaPublicDto> {
		try {
			this.credentialTypes.getByName(credentialTypeName);
		} catch {
			throw new NotFoundError('Not Found');
		}

		const properties = this.credentialsHelper
			.getCredentialsProperties(credentialTypeName)
			.filter((property) => property.type !== 'hidden');

		return toJsonSchema(properties);
	}
}
