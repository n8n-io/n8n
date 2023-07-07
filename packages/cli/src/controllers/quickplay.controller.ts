import { Get, Post, RestController } from '@/decorators';
import { AuthError } from '@/ResponseHelper';
import { sanitizeUser, withFeatureFlags } from '@/UserManagement/UserManagementHelper';
import { issueCookie, resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/constants';
import { Response } from 'express';
import type { User } from '@db/entities/User';
import type { IDatabaseCollections, CurrentUser } from '@/Interfaces';
import type { PostHogClient } from '@/posthog';

import type { UserRepository, RoleRepository } from '@db/repositories';
import { QpJwtRequest } from '@/middlewares/externalJWTAuth';
import { UM_FIX_INSTRUCTION } from '@/commands/BaseCommand';

export type TenantRequest = QpJwtRequest<
	{},
	{},
	{
		product_id: string;
	}
>;

@RestController('/quickplay')
export class QuickplayController {
	private readonly userRepo: UserRepository;

	private readonly roleRepo: RoleRepository;

	private readonly postHog?: PostHogClient;

	constructor({
		repositories,
		postHog,
	}: {
		repositories: Pick<IDatabaseCollections, 'User' | 'Role'>;
		postHog?: PostHogClient;
	}) {
		this.userRepo = repositories.User;
		this.roleRepo = repositories.Role;
		this.postHog = postHog;
	}

	@Get('/check')
	async check(req: QpJwtRequest): Promise<object> {
		// Manually check the existing cookie.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cookieContents = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

		const result = {
			jwt: req.jwt,
			env: process.env,
			headers: req.headers,
		};

		if (cookieContents) {
			const user: User = await resolveJwt(cookieContents);
			return {
				cookieUser: user,
				...result,
			};
		}

		return result;
	}

	@Post('/tenant')
	async tenant(req: TenantRequest, res: Response): Promise<CurrentUser> {
		if (!req.jwt) throw new AuthError('Token not found');

		const { product_id } = req.body;
		if (!product_id) throw new Error('product_id is required');

		const products = req.jwt.gcip.x_qp_entitlements.allowed_products;
		const product = products.find((i) => i.product_id === product_id);
		if (!product) throw new Error('Product not found among allowed by JWT');

		const email = `${product.workflow}@qp.qp`;
		const user = await this.userRepo.findOne({
			relations: ['globalRole'],
			where: { email },
		});
		if (!user) throw new Error(`There is no user with email ${email}`);
		if (!user.password || user.disabled) throw new Error('User has no password or disabled');
		await issueCookie(res, user);
		return withFeatureFlags(this.postHog, sanitizeUser(user));
	}

	@Post('/login-as-owner')
	async loginAsOwner(req: TenantRequest, res: Response): Promise<CurrentUser> {
		if (!req.jwt) throw new AuthError('Token not found');
		if (!req.jwt.gcip.x_qp_entitlements.is_super_admin)
			throw new AuthError('Infufficient permissions');

		const ownerGlobalRole = await this.roleRepo.findGlobalOwnerRole();

		const owner =
			ownerGlobalRole && (await this.userRepo.findOneBy({ globalRoleId: ownerGlobalRole.id }));

		if (!owner) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		if (!owner.password || owner.disabled) throw new Error('Owner has no password or disabled');

		await issueCookie(res, owner);
		return withFeatureFlags(this.postHog, sanitizeUser(owner));
	}
}
