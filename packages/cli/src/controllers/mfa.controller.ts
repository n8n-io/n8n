import { AuthenticatedRequest, UserRepository } from '@n8n/db';
import { Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
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
	) {}

	@Post('/enforce-mfa')
	@GlobalScope('user:enforceMfa')
	async enforceMFA(req: MFA.Enforce) {
		if (req.body.enforce && !(req.authInfo?.usedMfa ?? false)) {
			// The current user tries to enforce MFA, but does not have
			// MFA set up for them self. We are forbidding this, to
			// help the user not lock them selfs out.
			throw new BadRequestError(
				'You must enable two-factor authentication on your own account before enforcing it for all users',
			);
		}
		await this.mfaService.enforceMFA(req.body.enforce);
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
		const { email, id, mfaEnabled } = req.user;

		if (mfaEnabled)
			throw new BadRequestError(
				'MFA already enabled. Disable it to generate new secret and recovery codes',
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

	@Post('/enable', { rateLimit: true, allowSkipMFA: true })
	async activateMFA(req: MFA.Activate, res: Response) {
		const { mfaCode = null } = req.body;
		const { id, mfaEnabled } = req.user;

		await this.externalHooks.run('mfa.beforeSetup', [req.user]);

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!mfaCode) throw new BadRequestError('Token is required to enable MFA feature');

		if (mfaEnabled) throw new BadRequestError('MFA already enabled');

		if (!secret || !recoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const verified = this.mfaService.totp.verifySecret({ secret, mfaCode, window: 10 });

		if (!verified)
			throw new BadRequestError('MFA code expired. Close the modal and enable MFA again', 997);

		const updatedUser = await this.mfaService.enableMfa(id);

		this.authService.issueCookie(res, updatedUser, verified, req.browserId);
	}

	@Post('/disable', { rateLimit: true })
	async disableMFA(req: MFA.Disable, res: Response) {
		const { id: userId } = req.user;

		const { mfaCode, mfaRecoveryCode } = req.body;

		const mfaCodeDefined = mfaCode && typeof mfaCode === 'string';

		const mfaRecoveryCodeDefined = mfaRecoveryCode && typeof mfaRecoveryCode === 'string';

		if (!mfaCodeDefined === !mfaRecoveryCodeDefined) {
			throw new BadRequestError(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		}

		if (mfaCodeDefined) {
			await this.mfaService.disableMfaWithMfaCode(userId, mfaCode);
		} else if (mfaRecoveryCodeDefined) {
			await this.mfaService.disableMfaWithRecoveryCode(userId, mfaRecoveryCode);
		}

		const updatedUser = await this.userRepository.findOneOrFail({
			where: { id: userId },
			relations: ['role'],
		});

		this.authService.issueCookie(res, updatedUser, false, req.browserId);
	}

	@Post('/verify', { rateLimit: true, allowSkipMFA: true })
	async verifyMFA(req: MFA.Verify) {
		const { id } = req.user;
		const { mfaCode } = req.body;

		const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!mfaCode) throw new BadRequestError('MFA code is required to enable MFA feature');

		if (!secret) throw new BadRequestError('No MFA secret se for this user');

		const verified = this.mfaService.totp.verifySecret({ secret, mfaCode });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');
	}
}
