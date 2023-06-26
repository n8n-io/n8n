import { Authorized, Delete, Get, Post, RestController } from '@/decorators';
import { AuthenticatedRequest, MFA } from '@/requests';
import { BadRequestError } from '@/ResponseHelper';
import { MfaService } from '@/Mfa/mfa.service';
import Container from 'typedi';
import { ExternalHooks } from '@/ExternalHooks';
import { isInstanceOwner } from '@/PublicApi/v1/handlers/users/users.service.ee';

@Authorized()
@RestController('/mfa')
export class MFAController {
	constructor(private mfaService: MfaService) {}

	@Get('/qr')
	async getQRCode(req: AuthenticatedRequest) {
		const { email, id, mfaEnabled } = req.user;

		if (mfaEnabled)
			throw new BadRequestError(
				'MFA already enabled. Disable it to generate new secret and recovery codes',
			);

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getRawSecretAndRecoveryCodes(id);

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

		const newRecoveryCodes = this.mfaService.generateRawRecoveryCodes();

		const newSecret = this.mfaService.totp.generateSecret();

		const qrCode = this.mfaService.totp.generateTOTPUri({ secret: newSecret, label: email });

		await this.mfaService.saveSecretAndRecoveryCodes(id, newSecret, newRecoveryCodes);

		return {
			secret: newSecret,
			qrCode,
			recoveryCodes: newRecoveryCodes,
		};
	}

	@Post('/enable')
	async activateMFA(req: MFA.Activate) {
		const { token = null } = req.body;
		const { id, mfaEnabled, email } = req.user;

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getRawSecretAndRecoveryCodes(id);

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (mfaEnabled) throw new BadRequestError('MFA already enabled');

		if (!secret || !recoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const verified = this.mfaService.totp.verifySecret({ secret, token, window: 10 });

		if (!verified)
			throw new BadRequestError('MFA token expired. Close the modal and enable MFA again', 997);

		if (isInstanceOwner(req.user)) {
			await Container.get(ExternalHooks).run('user.mfa.update', [
				{
					email,
					mfaEnabled,
					mfaSecret: secret,
					mfaRecoveryCodes: recoveryCodes,
				},
			]);
		}

		await this.mfaService.enableMfa(id);
	}

	@Delete('/disable')
	async disableMFA(req: AuthenticatedRequest) {
		const { id, mfaEnabled, email } = req.user;

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getRawSecretAndRecoveryCodes(id);

		if (isInstanceOwner(req.user)) {
			await Container.get(ExternalHooks).run('user.mfa.update', [
				{
					email,
					mfaEnabled,
					mfaSecret: secret,
					mfaRecoveryCodes: recoveryCodes,
				},
			]);
		}

		await this.mfaService.disableMfa(id);
	}

	@Post('/verify')
	async verifyMFA(req: MFA.Verify) {
		const { id } = req.user;
		const { token } = req.body;

		const { decryptedSecret: secret } = await this.mfaService.getRawSecretAndRecoveryCodes(id);

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (!secret) throw new BadRequestError('No MFA secret se for this user');

		const verified = this.mfaService.totp.verifySecret({ secret, token });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');
	}
}
