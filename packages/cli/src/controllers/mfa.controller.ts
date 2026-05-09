import type { WebAuthnCredentialResponse } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { AuthenticatedRequest, UserRepository } from '@n8n/db';
import {
	createUserKeyedRateLimiter,
	Delete,
	Get,
	GlobalScope,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { MfaService } from '@/mfa/mfa.service';
import { MFA } from '@/requests';

@RestController('/mfa')
export class MFAController {
	constructor(
		private mfaService: MfaService,
		private externalHooks: ExternalHooks,
		private authService: AuthService,
		private userRepository: UserRepository,
		private eventService: EventService,
		private instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	@Post('/enforce-mfa')
	@GlobalScope('user:enforceMfa')
	async enforceMFA(req: MFA.Enforce) {
		if (this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv) {
			throw new ForbiddenError(
				'MFA enforcement is managed via environment variables and cannot be modified through the API',
			);
		}

		if (req.body.enforce && !(req.authInfo?.usedMfa ?? false)) {
			throw new BadRequestError(
				'You must enable two-factor authentication on your own account before enforcing it for all users',
			);
		}
		await this.mfaService.enforceMFA(req.body.enforce);

		this.eventService.emit('instance-policies-updated', {
			user: {
				id: req.user.id,
				email: req.user.email,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				role: req.user.role,
			},
			settingName: '2fa_enforcement',
			value: req.body.enforce,
		});

		return;
	}

	@Post('/can-enable', {
		allowSkipMFA: true,
	})
	async canEnableMFA(req: AuthenticatedRequest) {
		await this.externalHooks.run('mfa.beforeSetup', [req.user]);
		return;
	}

	@Get('/qr', {
		allowSkipMFA: true,
	})
	async getQRCode(req: AuthenticatedRequest) {
		const { email, id, mfaMethod } = req.user;

		if (mfaMethod === 'totp')
			throw new BadRequestError(
				'MFA already enabled with the authenticator app. Disable it to generate a new secret and recovery codes',
			);

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getSecretAndRecoveryCodes(id);

		if (secret && recoveryCodes.length) {
			const qrCode = this.mfaService.totp.generateTOTPUri({
				secret,
				label: email,
			});

			return {
				secret,
				recoveryCodes,
				qrCode,
			};
		}

		const newRecoveryCodes = this.mfaService.generateRecoveryCodes();

		const newSecret = this.mfaService.totp.generateSecret();

		const qrCode = this.mfaService.totp.generateTOTPUri({ secret: newSecret, label: email });

		await this.mfaService.saveSecretAndRecoveryCodes(id, newSecret, newRecoveryCodes);

		return {
			secret: newSecret,
			qrCode,
			recoveryCodes: newRecoveryCodes,
		};
	}

	@Post('/enable', {
		allowSkipMFA: true,
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async activateMFA(req: MFA.Activate, res: Response) {
		const { mfaCode = null } = req.body;
		const { id, mfaMethod } = req.user;

		await this.externalHooks.run('mfa.beforeSetup', [req.user]);

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!mfaCode) throw new BadRequestError('Token is required to enable MFA feature');

		if (mfaMethod === 'totp') throw new BadRequestError('MFA already enabled');

		if (!secret || !recoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const verified = this.mfaService.totp.verifySecret({ secret, mfaCode, window: 10 });

		if (!verified)
			throw new BadRequestError('MFA code expired. Close the modal and enable MFA again', 997);

		// Switching from webauthn to TOTP — clear any existing webauthn credentials
		await this.mfaService.webauthn.deleteAllUserCredentials(id);

		const updatedUser = await this.mfaService.setMfaMethod(id, 'totp');

		this.eventService.emit('user-mfa-enabled', {
			user: {
				id: req.user.id,
				email: req.user.email,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				role: req.user.role,
			},
		});

		this.authService.issueCookie(res, updatedUser, verified, req.browserId);
	}

	@Post('/disable', {
		ipRateLimit: true,
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async disableMFA(req: MFA.Disable, res: Response) {
		const { id: userId } = req.user;

		const { mfaCode, mfaRecoveryCode, webauthnResponse } = req.body;

		const mfaCodeDefined = !!(mfaCode && typeof mfaCode === 'string');
		const mfaRecoveryCodeDefined = !!(mfaRecoveryCode && typeof mfaRecoveryCode === 'string');
		const webauthnDefined = webauthnResponse !== undefined && webauthnResponse !== null;

		const proofs = [mfaCodeDefined, mfaRecoveryCodeDefined, webauthnDefined].filter(Boolean);
		if (proofs.length !== 1) {
			throw new BadRequestError(
				'Exactly one of mfaCode, mfaRecoveryCode, or webauthnResponse is required to disable MFA',
			);
		}

		let disableMethod: 'mfaCode' | 'recoveryCode' | 'webauthn';
		if (mfaCodeDefined) {
			await this.mfaService.disableMfaWithMfaCode(userId, mfaCode!);
			disableMethod = 'mfaCode';
		} else if (mfaRecoveryCodeDefined) {
			await this.mfaService.disableMfaWithRecoveryCode(userId, mfaRecoveryCode!);
			disableMethod = 'recoveryCode';
		} else {
			await this.mfaService.disableMfaWithWebAuthn(userId, webauthnResponse);
			disableMethod = 'webauthn';
		}

		this.eventService.emit('user-mfa-disabled', {
			user: {
				id: req.user.id,
				email: req.user.email,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				role: req.user.role,
			},
			disableMethod,
		});

		const updatedUser = await this.userRepository.findOneOrFail({
			where: { id: userId },
			relations: ['role'],
		});

		this.authService.issueCookie(res, updatedUser, false, req.browserId);
	}

	@Post('/verify', {
		allowSkipMFA: true,
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async verifyMFA(req: MFA.Verify) {
		const { id } = req.user;
		const { mfaCode } = req.body;

		const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!mfaCode) throw new BadRequestError('MFA code is required to enable MFA feature');

		if (!secret) throw new BadRequestError('No MFA secret se for this user');

		const verified = this.mfaService.totp.verifySecret({ secret, mfaCode });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');
	}

	// ---------------------------------------------------------------
	// WebAuthn endpoints
	// ---------------------------------------------------------------

	@Get('/webauthn/registration-options', {
		allowSkipMFA: true,
	})
	async getWebAuthnRegistrationOptions(
		req: AuthenticatedRequest<{}, {}, {}, { attachment?: string }>,
	) {
		const { id, email } = req.user;
		const { attachment } = req.query;

		if (attachment !== 'platform' && attachment !== 'cross-platform') {
			throw new BadRequestError(
				'attachment query parameter must be "platform" or "cross-platform"',
			);
		}

		const existingCredentials = await this.mfaService.webauthn.getUserCredentials(id);
		const existingIds = existingCredentials.map((c) => c.credentialId);

		return await this.mfaService.webauthn.generateRegistrationOptions(
			id,
			email,
			existingIds,
			attachment,
		);
	}

	@Post('/webauthn/registration-verify', {
		allowSkipMFA: true,
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async verifyWebAuthnRegistration(
		req: AuthenticatedRequest<
			{},
			{},
			{ label: string; response: unknown; attachment: 'platform' | 'cross-platform' }
		>,
		res: Response,
	) {
		const { id: userId } = req.user;
		const { label, response, attachment } = req.body;

		if (!label || typeof label !== 'string') {
			throw new BadRequestError('A label is required');
		}

		if (attachment !== 'platform' && attachment !== 'cross-platform') {
			throw new BadRequestError('attachment must be "platform" or "cross-platform"');
		}

		const verification = await this.mfaService.webauthn.verifyRegistrationResponse(
			userId,
			response,
			attachment,
		);

		if (!verification.verified || !verification.registrationInfo) {
			throw new BadRequestError('WebAuthn registration verification failed');
		}

		// Replace any existing 2FA state — only one method active at a time
		await this.mfaService.webauthn.deleteAllUserCredentials(userId);
		await this.mfaService.clearTotpState(userId);

		const savedCredential = await this.mfaService.webauthn.saveCredential(
			userId,
			label.trim(),
			verification.registrationInfo,
			(response as { response?: { transports?: string[] } })?.response?.transports,
		);

		const method = attachment === 'platform' ? 'passkey' : 'security_key';
		const updatedUser = await this.mfaService.setMfaMethod(userId, method);
		this.authService.issueCookie(res, updatedUser, true, req.browserId);

		return {
			id: savedCredential.id,
			credentialId: savedCredential.credentialId,
			label: savedCredential.label,
		};
	}

	@Post('/webauthn/authentication-options', {
		skipAuth: true,
	})
	async getWebAuthnAuthenticationOptions(req: AuthenticatedRequest<{}, {}, { email: string }>) {
		const { email } = req.body;
		if (!email) {
			throw new BadRequestError('Email is required');
		}

		const user = await this.userRepository.findOne({ where: { email } });
		if (!user || !user.mfaEnabled) {
			// Return empty options to avoid leaking user existence
			throw new BadRequestError('MFA Error', 998);
		}

		return await this.mfaService.webauthn.generateAuthenticationOptions(user.id);
	}

	@Get('/webauthn/credentials')
	async getWebAuthnCredentials(req: AuthenticatedRequest): Promise<WebAuthnCredentialResponse[]> {
		const credentials = await this.mfaService.webauthn.getUserCredentials(req.user.id);
		return credentials.map((c) => ({
			id: c.id,
			credentialId: c.credentialId,
			label: c.label,
			deviceType: c.deviceType,
			backedUp: c.backedUp,
			transports: c.transports,
			createdAt: c.createdAt.toISOString(),
		}));
	}

	@Delete('/webauthn/credentials/:id')
	async deleteWebAuthnCredential(req: AuthenticatedRequest<{ id: string }>, res: Response) {
		const { id } = req.params;
		const userId = req.user.id;

		const deleted = await this.mfaService.webauthn.deleteCredential(id, userId);
		if (!deleted) {
			throw new BadRequestError('Credential not found');
		}

		// Check if user has any remaining MFA methods
		const hasWebauthnCredentials = await this.mfaService.webauthn.hasCredentials(userId);
		const { decryptedSecret } = await this.mfaService.getSecretAndRecoveryCodes(userId);
		const hasTotpSecret = !!decryptedSecret;

		if (!hasWebauthnCredentials && !hasTotpSecret) {
			await this.userRepository.update(userId, {
				mfaEnabled: false,
				mfaSecret: null,
				mfaRecoveryCodes: [],
				mfaMethod: null,
			});

			const updatedUser = await this.userRepository.findOneOrFail({
				where: { id: userId },
				relations: ['role'],
			});
			this.authService.issueCookie(res, updatedUser, false, req.browserId);
		}

		return { success: true };
	}

	@Patch('/webauthn/credentials/:id')
	async updateWebAuthnCredential(req: AuthenticatedRequest<{ id: string }, {}, { label: string }>) {
		const { id } = req.params;
		const { label } = req.body;

		if (!label || typeof label !== 'string') {
			throw new BadRequestError('A label is required');
		}

		await this.mfaService.webauthn.updateCredentialLabel(id, req.user.id, label.trim());
		return { success: true };
	}
}
