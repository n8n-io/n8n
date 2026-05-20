import type { WebAuthnCredentialResponse } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { AuthenticatedRequest, UserRepository } from '@n8n/db';
import {
	createUserKeyedRateLimiter,
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
import { countMfaProofs, MfaService } from '@/mfa/mfa.service';
import { isPlatformCredential } from '@/mfa/webauthn.service';
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
		const { email, id } = req.user;

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
		const { id } = req.user;

		await this.externalHooks.run('mfa.beforeSetup', [req.user]);

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!mfaCode) throw new BadRequestError('Token is required to enable MFA feature');

		if (!secret || !recoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const verified = this.mfaService.totp.verifySecret({ secret, mfaCode, window: 10 });

		if (!verified)
			throw new BadRequestError('MFA code expired. Close the modal and enable MFA again', 997);

		await this.mfaService.enableMfa(id);

		this.eventService.emit('user-mfa-enabled', {
			user: {
				id: req.user.id,
				email: req.user.email,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				role: req.user.role,
			},
		});

		await this.authService.rotateSession(res, req.user, verified, req);
	}

	@Post('/disable', {
		ipRateLimit: true,
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async disableMFA(req: MFA.Disable, res: Response) {
		const { id: userId } = req.user;

		const { mfaCode, mfaRecoveryCode, webauthnResponse } = req.body;

		if (countMfaProofs(req.body) !== 1) {
			throw new BadRequestError(
				'Exactly one of mfaCode, mfaRecoveryCode, or webauthnResponse is required to disable MFA',
			);
		}

		let disableMethod: 'mfaCode' | 'recoveryCode' | 'webauthn';
		if (typeof mfaCode === 'string' && mfaCode.length > 0) {
			await this.mfaService.disableMfaWithMfaCode(userId, mfaCode);
			disableMethod = 'mfaCode';
		} else if (typeof mfaRecoveryCode === 'string' && mfaRecoveryCode.length > 0) {
			await this.mfaService.disableMfaWithRecoveryCode(userId, mfaRecoveryCode);
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

		await this.authService.rotateSession(res, req.user, false, req);
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

	@Get('/webauthn/registration-options', {
		allowSkipMFA: true,
	})
	async getWebAuthnRegistrationOptions(
		req: AuthenticatedRequest<{}, {}, {}, { attachment?: string }>,
	) {
		const { id, email, firstName, lastName } = req.user;
		const { attachment } = req.query;

		if (attachment !== 'platform' && attachment !== 'cross-platform') {
			throw new BadRequestError(
				'attachment query parameter must be "platform" or "cross-platform"',
			);
		}

		const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

		return await this.mfaService.webauthn.generateRegistrationOptions(
			id,
			email,
			displayName,
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

		const transports = (response as { response?: { transports?: string[] } })?.response?.transports;

		const savedCredential = await this.mfaService.webauthn.saveCredential(
			userId,
			label.trim(),
			verification.registrationInfo,
			transports,
		);

		const method = isPlatformCredential({
			transports: transports ?? null,
			deviceType: verification.registrationInfo.credentialDeviceType,
		})
			? 'passkey'
			: 'security_key';

		await this.mfaService.enableMfa(userId);
		await this.authService.rotateSession(res, req.user, true, req);

		return {
			id: savedCredential.id,
			credentialId: savedCredential.credentialId,
			label: savedCredential.label,
			method,
		};
	}

	@Post('/webauthn/authentication-options', {
		skipAuth: true,
	})
	async getWebAuthnAuthenticationOptions(
		req: AuthenticatedRequest<{}, {}, { email: string; kind?: 'passkey' | 'security_key' }>,
	) {
		const { email, kind } = req.body;
		if (!email) {
			throw new BadRequestError('Email is required');
		}

		const user = await this.userRepository.findOne({ where: { email } });
		if (!user || !user.mfaEnabled) {
			// Return empty options to avoid leaking user existence
			throw new BadRequestError('MFA Error', 998);
		}

		const narrowedKind = kind === 'passkey' || kind === 'security_key' ? kind : undefined;
		return await this.mfaService.webauthn.generateAuthenticationOptions(user.id, narrowedKind);
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
			aaguid: c.aaguid ?? null,
			createdAt: c.createdAt.toISOString(),
			lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
		}));
	}

	// Use POST (not DELETE) so the proof body reliably reaches the server —
	// our rest-api-client routes DELETE data through query params, which
	// can't carry a structured webauthn assertion.
	@Post('/webauthn/credentials/:id/remove')
	async deleteWebAuthnCredential(
		req: AuthenticatedRequest<
			{ id: string },
			{},
			{ mfaCode?: string; mfaRecoveryCode?: string; webauthnResponse?: unknown }
		>,
		res: Response,
	) {
		const { id } = req.params;
		const userId = req.user.id;

		// Removing a credential is security-sensitive — re-verify the user's
		// active 2FA method (TOTP code, recovery code, or a fresh webauthn
		// assertion) before we touch the credential row.
		if (countMfaProofs(req.body) !== 1) {
			throw new BadRequestError(
				'Exactly one of mfaCode, mfaRecoveryCode, or webauthnResponse is required to remove this credential',
			);
		}

		const proofValid = await this.mfaService.validateProof(userId, req.body);
		if (!proofValid) {
			throw new BadRequestError('Invalid two-factor proof');
		}

		const [credentialsBefore, isMFAEnforced, hasTotpSecret] = await Promise.all([
			this.mfaService.webauthn.getUserCredentials(userId),
			this.mfaService.isMFAEnforced(),
			this.mfaService.hasTotpSecret(userId),
		]);
		const remainingWebauthn = credentialsBefore.filter((c) => c.id !== id).length;

		if (isMFAEnforced && remainingWebauthn === 0 && !hasTotpSecret) {
			throw new BadRequestError(
				'You can’t remove your last MFA credential while two-factor authentication is required on this instance',
			);
		}

		const deleted = await this.mfaService.webauthn.deleteCredential(id, userId);
		if (!deleted) {
			throw new BadRequestError('Credential not found');
		}

		// Mirror disable-MFA semantics when the last factor is gone so the
		// session reflects the new state.
		if (remainingWebauthn === 0 && !hasTotpSecret) {
			await this.userRepository.update(userId, {
				mfaEnabled: false,
				mfaSecret: null,
				mfaRecoveryCodes: [],
			});

			await this.authService.rotateSession(res, req.user, false, req);
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
