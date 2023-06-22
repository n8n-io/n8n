import validator from 'validator';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { AuthError, BadRequestError, InternalServerError } from '@/ResponseHelper';
import { sanitizeUser, withFeatureFlags } from '@/UserManagement/UserManagementHelper';
import { issueCookie, resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/constants';
import { Request, Response } from 'express';
import type { ILogger } from 'n8n-workflow';
import type { User } from '@db/entities/User';
import { AuthlessRequest, LoginRequest, UserRequest } from '@/requests';
import { In } from 'typeorm';
import type { Config } from '@/config';
import type {
	PublicUser,
	IDatabaseCollections,
	IInternalHooksClass,
	CurrentUser,
} from '@/Interfaces';
import { handleEmailLogin, handleLdapLogin } from '@/auth';
import type { PostHogClient } from '@/posthog';
import {
	getCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from '@/sso/ssoHelpers';
import type { UserRepository } from '@db/repositories';
import { InternalHooks } from '../InternalHooks';
import Container from 'typedi';
import { QpJwtRequest } from '@/middlewares/externalJWTAuth';

export type TenantRequest = QpJwtRequest<
	{},
	{},
	{
		product_id: string;
	}
>;

@RestController('/quickplay')
export class QuickplayController {
	private readonly config: Config;

	private readonly logger: ILogger;

	private readonly internalHooks: IInternalHooksClass;

	private readonly userRepository: UserRepository;

	private readonly postHog?: PostHogClient;

	constructor({
		config,
		logger,
		internalHooks,
		repositories,
		postHog,
	}: {
		config: Config;
		logger: ILogger;
		internalHooks: IInternalHooksClass;
		repositories: Pick<IDatabaseCollections, 'User'>;
		postHog?: PostHogClient;
	}) {
		this.config = config;
		this.logger = logger;
		this.internalHooks = internalHooks;
		this.userRepository = repositories.User;
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
		const user = await this.userRepository.findOne({
			relations: ['globalRole'],
			where: { email },
		});
		if (!user) throw new Error(`There is no user with email ${email}`);
		if (!user.password || user.disabled) throw new Error('User has no password or disabled');
		await issueCookie(res, user);
		return withFeatureFlags(this.postHog, sanitizeUser(user));
	}
}
