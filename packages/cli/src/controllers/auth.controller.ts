import { AuthService } from '@/auth/auth.service';
import { Get, Post, RestController } from '@/decorators';
import { Request, Response } from 'express';
import type { User } from '@db/entities/User';
import { AuthenticatedRequest, LoginRequest } from '@/requests';
import type { PublicUser } from '@/Interfaces';
import { handleEmailLogin, handleLdapLogin } from '@/auth';
import { PostHogClient } from '@/posthog';
import {
	getCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from '@/sso/ssoHelpers';
import { InternalHooks } from '../InternalHooks';
import { UserService } from '@/services/user.service';
import { MfaService } from '@/Mfa/mfa.service';
import { AuthError } from '@/errors/response-errors/auth.error';
import { ApplicationError } from 'n8n-workflow';

@RestController()
export class AuthController {
	constructor(
		private readonly internalHooks: InternalHooks,
		private readonly authService: AuthService,
		private readonly mfaService: MfaService,
		private readonly userService: UserService,
		private readonly postHog?: PostHogClient,
	) {}

	/** Log in a user */
	@Post('/login', { skipAuth: true })
	async login(req: LoginRequest, res: Response): Promise<PublicUser | undefined> {
		const { email, password, mfaToken, mfaRecoveryCode } = req.body;
		if (!email) throw new ApplicationError('Email is required to log in');
		if (!password) throw new ApplicationError('Password is required to log in');

		let user: User | undefined;

		let usedAuthenticationMethod = getCurrentAuthenticationMethod();
		if (isSamlCurrentAuthenticationMethod()) {
			// attempt to fetch user data with the credentials, but don't log in yet
			const preliminaryUser = await handleEmailLogin(email, password);
			// if the user is an owner, continue with the login
			if (
				preliminaryUser?.role === 'global:owner' ||
				preliminaryUser?.settings?.allowSSOManualLogin
			) {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				throw new AuthError('SSO is enabled, please log in with SSO');
			}
		} else if (isLdapCurrentAuthenticationMethod()) {
			const preliminaryUser = await handleEmailLogin(email, password);
			if (preliminaryUser?.role === 'global:owner') {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				user = await handleLdapLogin(email, password);
			}
		} else {
			user = await handleEmailLogin(email, password);
		}

		if (user) {
			if (user.mfaEnabled) {
				if (!mfaToken && !mfaRecoveryCode) {
					throw new AuthError('MFA Error', 998);
				}

				const { decryptedRecoveryCodes, decryptedSecret } =
					await this.mfaService.getSecretAndRecoveryCodes(user.id);

				user.mfaSecret = decryptedSecret;
				user.mfaRecoveryCodes = decryptedRecoveryCodes;

				const isMFATokenValid =
					(await this.validateMfaToken(user, mfaToken)) ||
					(await this.validateMfaRecoveryCode(user, mfaRecoveryCode));

				if (!isMFATokenValid) {
					throw new AuthError('Invalid mfa token or recovery code');
				}
			}

			this.authService.issueCookie(res, user);
			void this.internalHooks.onUserLoginSuccess({
				user,
				authenticationMethod: usedAuthenticationMethod,
			});

			return await this.userService.toPublic(user, { posthog: this.postHog, withScopes: true });
		}
		void this.internalHooks.onUserLoginFailed({
			user: email,
			authenticationMethod: usedAuthenticationMethod,
			reason: 'wrong credentials',
		});
		throw new AuthError('Wrong username or password. Do you have caps lock on?');
	}

	/** Check if the user is already logged in */
	@Get('/login')
	async currentUser(req: AuthenticatedRequest): Promise<PublicUser> {
		return await this.userService.toPublic(req.user, {
			posthog: this.postHog,
			withScopes: true,
		});
	}

	/** Log out a user */
	@Post('/logout')
	logout(_: Request, res: Response) {
		this.authService.clearCookie(res);
		return { loggedOut: true };
	}

	private async validateMfaToken(user: User, token?: string) {
		if (!!!token) return false;
		return this.mfaService.totp.verifySecret({
			secret: user.mfaSecret ?? '',
			token,
		});
	}

	private async validateMfaRecoveryCode(user: User, mfaRecoveryCode?: string) {
		if (!!!mfaRecoveryCode) return false;
		const index = user.mfaRecoveryCodes.indexOf(mfaRecoveryCode);
		if (index === -1) return false;

		// remove used recovery code
		user.mfaRecoveryCodes.splice(index, 1);

		await this.userService.update(user.id, {
			mfaRecoveryCodes: this.mfaService.encryptRecoveryCodes(user.mfaRecoveryCodes),
		});

		return true;
	}
}
