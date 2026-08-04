import {
	CreateServiceAccountRequestDto,
	RoleChangeRequestDto,
	UpdateServiceAccountRequestDto,
	UsersListFilterDto,
	serviceAccountsListSchema,
	serviceAccountSchema,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ServiceAccountsService } from './service-accounts.service';

/** The display name lives in `firstName`; the synthesized email is read-only. */
function toPublicServiceAccount(serviceAccount: User) {
	return {
		id: serviceAccount.id,
		name: serviceAccount.firstName,
		email: serviceAccount.email,
		role: serviceAccount.role?.slug,
		disabled: serviceAccount.disabled,
		createdAt: serviceAccount.createdAt,
	};
}

@RestController('/service-accounts')
export class ServiceAccountsController {
	constructor(private readonly serviceAccountsService: ServiceAccountsService) {}

	@Get('/')
	@GlobalScope('serviceAccount:list')
	async list(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query listQueryOptions: UsersListFilterDto,
	) {
		const { count, items } = await this.serviceAccountsService.list(listQueryOptions);

		return serviceAccountsListSchema.parse({
			count,
			items: items.map(toPublicServiceAccount),
		});
	}

	@Post('/')
	@GlobalScope('serviceAccount:create')
	async create(
		req: AuthenticatedRequest,
		res: Response,
		@Body dto: CreateServiceAccountRequestDto,
	) {
		const serviceAccount = await this.serviceAccountsService.create(dto, req.user);
		res.status(201);
		return serviceAccountSchema.parse(toPublicServiceAccount(serviceAccount));
	}

	@Get('/:id')
	@GlobalScope('serviceAccount:read')
	async get(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		const serviceAccount = await this.serviceAccountsService.findOneOrFail(id);
		return serviceAccountSchema.parse(toPublicServiceAccount(serviceAccount));
	}

	@Patch('/:id')
	@GlobalScope('serviceAccount:update')
	async update(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body dto: UpdateServiceAccountRequestDto,
	) {
		const serviceAccount = await this.serviceAccountsService.update(id, dto);
		return serviceAccountSchema.parse(toPublicServiceAccount(serviceAccount));
	}

	@Patch('/:id/role')
	@GlobalScope('serviceAccount:update')
	async changeRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body dto: RoleChangeRequestDto,
	) {
		await this.serviceAccountsService.changeRole(id, dto, req.user);
		return { success: true };
	}

	@Delete('/:id')
	@GlobalScope('serviceAccount:delete')
	async delete(
		req: AuthenticatedRequest<{ id: string }, {}, {}, { transferId?: string }>,
		_res: Response,
		@Param('id') id: string,
	) {
		await this.serviceAccountsService.delete(id, req.user, req.query.transferId);
		return { success: true };
	}
}
