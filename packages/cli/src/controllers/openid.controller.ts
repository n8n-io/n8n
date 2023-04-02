import { issueCookie } from '@/auth/jwt';
import { AuthIdentity } from '@/databases/entities/AuthIdentity';
import type { Role } from '@/databases/entities/Role';
import type { User } from '@/databases/entities/User';
import { Get, Put, RestController } from '@/decorators';
import { IDatabaseCollections } from '@/Interfaces';
import { randomPassword } from '@/Ldap/helpers';
import { decryptClientSecret, getOpenIdConfig, updateOpenIDConfig } from '@/OpenID/helpers';
import { OpenIDConfiguration } from '@/OpenID/types';
import { BadRequestError } from '@/ResponseHelper';
import { Request, Response } from 'express';
import { Issuer } from 'openid-client';
import type { IdTokenClaims } from 'openid-client';

@RestController('/openid')
export class OpenIDController {
	constructor(private internalAPIBaseURL: string, private repositories: IDatabaseCollections) {}

	@Get('/config')
	async getConfig() {
		const config = await getOpenIdConfig();
		config.clientSecret = await decryptClientSecret(config.clientSecret);
		return config;
	}

	@Put('/config')
	async updateConfig(req: OpenIDConfiguration.Update) {
		try {
			await updateOpenIDConfig(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}

		const data = await getOpenIdConfig();

		return data;
	}

	@Get('/login')
	async getOpenIDLoginLink(req: Request, res: Response) {
		const config = await getOpenIdConfig();

		const issuer = await Issuer.discover(config.discoveryEndpoint);

		config.clientSecret = await decryptClientSecret(config.clientSecret);

		const client = new issuer.Client({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uris: [this.getCallbackURL()],
			response_types: ['code'],
		});

		const authorizationURL = client.authorizationUrl({
			scope: 'openid email profile',
			prompt: 'select_account',
		});

		res.redirect(authorizationURL);
	}

	@Get('/callback')
	async callbackHandler(req: Request, res: Response) {
		const config = await getOpenIdConfig();

		const issuer = await Issuer.discover(config.discoveryEndpoint);

		config.clientSecret = await decryptClientSecret(config.clientSecret);

		const client = new issuer.Client({
			client_id: config.clientId,
			client_secret: config.clientSecret,
		});

		const params = client.callbackParams(req.originalUrl);

		const token = await client.callback(this.getCallbackURL(), params);

		const claims = token.claims();

		if (!claims.email_verified) {
			throw new BadRequestError('Email needs to be verified');
		}

		if (!claims.email) {
			throw new BadRequestError('An email is required');
		}

		const openidUser = await this.repositories.AuthIdentity.findOne({
			where: { providerId: claims.sub },
			relations: ['user'],
		});

		if (openidUser) {
			await issueCookie(res, openidUser.user);
			res.redirect('/workflows');
			return;
		}

		const userExist = await this.repositories.User.count({ where: { email: claims.email } });

		if (userExist) {
			throw new BadRequestError('User already exist with that email.');
		}

		const role = await this.getOpenIDDefaultRole();

		const authIdentity = await this.createOpenIDUser(
			role,
			this.createUserShell(claims),
			claims.sub,
		);

		const newUser = await this.repositories.User.findOneOrFail({
			where: { id: authIdentity.userId },
		});

		await issueCookie(res, newUser);

		res.redirect('/workflows');
	}

	private getCallbackURL() {
		return `${this.internalAPIBaseURL}/openid/callback`;
	}

	// TODO: Do it in a transaction
	private async createOpenIDUser(role: Role, data: Partial<User>, id: string) {
		const user = await this.repositories.User.save({
			password: randomPassword(),
			globalRole: role,
			...data,
		});
		return this.repositories.AuthIdentity.save(AuthIdentity.create(user, id, 'openid'));
	}

	private async getOpenIDDefaultRole() {
		return this.repositories.Role.findOneByOrFail({ scope: 'global', name: 'member' });
	}

	private createUserShell(claims: IdTokenClaims) {
		const user: Partial<User> = {
			firstName: claims.given_name ?? '',
			lastName: claims.family_name ?? '',
			email: claims.email ?? '',
		};
		return user;
	}
}
