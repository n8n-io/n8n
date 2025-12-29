import {
	CreateCredentialResolverDto,
	CredentialResolver,
	credentialResolverSchema,
	credentialResolversSchema,
	UpdateCredentialResolverDto,
	CredentialResolverType,
	credentialResolverTypesSchema,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	RestController,
	CredentialResolverValidationError,
} from '@n8n/decorators';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { DynamicCredentialResolverNotFoundError } from './errors/credential-resolver-not-found.error';
import { DynamicCredentialResolverService } from './services/credential-resolver.service';

@RestController('/credential-resolvers')
export class CredentialResolversController {
	constructor(private readonly service: DynamicCredentialResolverService) {}

	@Get('/')
	@GlobalScope('credentialResolver:list')
	async listResolvers(_req: AuthenticatedRequest, _res: Response): Promise<CredentialResolver[]> {
		try {
			return credentialResolversSchema.parse(await this.service.findAll());
		} catch (e: unknown) {
			if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			}
			throw e;
		}
	}

	@Get('/types')
	@GlobalScope('credentialResolver:list')
	listResolverTypes(_req: AuthenticatedRequest, _res: Response): CredentialResolverType[] {
		try {
			const types = this.service.getAvailableTypes();
			return credentialResolverTypesSchema.parse(types.map((t) => t.metadata));
		} catch (e: unknown) {
			if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			}
			throw e;
		}
	}

	@Post('/')
	@GlobalScope('credentialResolver:create')
	async createResolver(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateCredentialResolverDto,
	): Promise<CredentialResolver> {
		try {
			const createdResolver = await this.service.create({
				name: dto.name,
				type: dto.type,
				config: dto.config,
			});
			return credentialResolverSchema.parse(createdResolver);
		} catch (e: unknown) {
			if (e instanceof CredentialResolverValidationError) {
				throw new BadRequestError(e.message);
			}
			if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			}
			throw e;
		}
	}

	@Get('/:id')
	@GlobalScope('credentialResolver:read')
	async getResolver(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<CredentialResolver> {
		try {
			return credentialResolverSchema.parse(await this.service.findById(id));
		} catch (e: unknown) {
			if (e instanceof DynamicCredentialResolverNotFoundError) {
				throw new NotFoundError(e.message);
			}
			if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			}
			throw e;
		}
	}

	@Patch('/:id')
	@GlobalScope('credentialResolver:update')
	async updateResolver(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body dto: UpdateCredentialResolverDto,
	): Promise<CredentialResolver> {
		try {
			return credentialResolverSchema.parse(
				await this.service.update(id, {
					type: dto.type,
					name: dto.name,
					config: dto.config,
				}),
			);
		} catch (e: unknown) {
			if (e instanceof DynamicCredentialResolverNotFoundError) {
				throw new NotFoundError(e.message);
			}
			if (e instanceof CredentialResolverValidationError) {
				throw new BadRequestError(e.message);
			}
			if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			}
			throw e;
		}
	}

	@Delete('/:id')
	@GlobalScope('credentialResolver:delete')
	async deleteResolver(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<{ success: true }> {
		try {
			await this.service.delete(id);
			return { success: true };
		} catch (e: unknown) {
			if (e instanceof DynamicCredentialResolverNotFoundError) {
				throw new NotFoundError(e.message);
			}
			if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			}
			throw e;
		}
	}
}
