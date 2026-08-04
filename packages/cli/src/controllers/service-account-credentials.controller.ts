import type {
	ServiceAccountCredential as ServiceAccountCredentialResponse,
	ServiceAccountCredentialWithSecret,
} from '@n8n/api-types';
import { CreateServiceAccountCredentialRequestDto } from '@n8n/api-types';
import type { ServiceAccountCredential, AuthenticatedRequest } from '@n8n/db';
import { GLOBAL_ADMIN_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ServiceAccountCredentialService } from '@/services/service-account-credential.service';

@RestController('/service-account-credentials')
export class ServiceAccountCredentialsController {
	constructor(private readonly serviceAccountCredentialService: ServiceAccountCredentialService) {}

	@Post('/')
	async create(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateServiceAccountCredentialRequestDto,
	): Promise<ServiceAccountCredentialWithSecret> {
		this.assertOwnerOrAdmin(req);

		const { credential, rawClientSecret } =
			await this.serviceAccountCredentialService.createForUser(
				body.userId,
				body.label,
				body.credentialType,
			);

		return { ...this.toResponse(credential), clientSecret: rawClientSecret };
	}

	@Get('/')
	async list(
		req: AuthenticatedRequest<{}, {}, {}, { userId?: string }>,
	): Promise<ServiceAccountCredentialResponse[]> {
		this.assertOwnerOrAdmin(req);

		const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
		const credentials = userId
			? await this.serviceAccountCredentialService.listForUser(userId)
			: await this.serviceAccountCredentialService.list();

		return credentials.map((credential) => this.toResponse(credential));
	}

	@Delete('/:id')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		this.assertOwnerOrAdmin(req);

		await this.serviceAccountCredentialService.delete(id);

		return { success: true };
	}

	/** Restrict management of service account credentials to the instance owner/admins. */
	private assertOwnerOrAdmin(req: AuthenticatedRequest): void {
		const roleSlug = req.user.role.slug;
		if (roleSlug !== GLOBAL_OWNER_ROLE.slug && roleSlug !== GLOBAL_ADMIN_ROLE.slug) {
			throw new ForbiddenError('Only instance owners and admins may manage service accounts');
		}
	}

	/** Maps the persisted entity to the API response, never exposing the stored secret hash. */
	private toResponse(credential: ServiceAccountCredential): ServiceAccountCredentialResponse {
		return {
			id: credential.id,
			clientId: credential.clientId,
			credentialType: credential.credentialType,
			userId: credential.userId,
			createdAt: credential.createdAt.toISOString(),
		};
	}
}
