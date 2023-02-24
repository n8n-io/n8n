import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Delete, Get, Post, RestController } from '@/decorators';
import { AuthenticatedRequest, MFA } from '@/requests';
import type { User } from '@db/entities/User';
import { BadRequestError } from '@/ResponseHelper';
import { MultiFactorAuthService } from '@/MultiFactorAuthService';

const issuer = 'n8n';

@RestController('/mfa')
export class MFAController {
	constructor(
		private userRepository: Repository<User>,
		private mfaService: MultiFactorAuthService,
	) {}

	@Get('/qr')
	async getQRCode(req: AuthenticatedRequest) {
		const { email, id, mfaSecret, mfaRecoveryCodes, mfaEnabled } = req.user;

		if (mfaEnabled)
			throw new BadRequestError(
				'MFA already enabled. Disable it to generate new secret and recovery codes',
			);

		if (mfaSecret && mfaRecoveryCodes.length) {
			const qrCode = this.mfaService.createQrUrlFromSecret({
				secret: mfaSecret,
				label: email,
			});
			return {
				secret: mfaSecret,
				recoveryCodes: mfaRecoveryCodes,
				qrCode,
			};
		}

		const codes = Array.from(Array(10)).map(() => uuid());

		const { secret, url } = this.mfaService.generateSecret({
			issuer,
			label: email,
		});

		await this.userRepository.update(id, {
			mfaSecret: secret,
			mfaRecoveryCodes: codes,
		});

		return {
			secret,
			qrCode: url,
			recoveryCodes: codes,
		};
	}

	@Post('/enable')
	async activateMFA(req: MFA.Activate) {
		const { token = null } = req.body;
		const { id, mfaRecoveryCodes, mfaSecret, mfaEnabled } = req.user;

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (mfaEnabled) throw new BadRequestError('MFA already enabled');

		if (!mfaSecret || !mfaRecoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const verified = this.mfaService.verifySecret({ secret: mfaSecret, token });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');

		await this.userRepository.update(id, { mfaEnabled: true });
	}

	@Delete('/disable')
	async disableMFA(req: AuthenticatedRequest) {
		const { id } = req.user;
		await this.userRepository.update(id, {
			mfaEnabled: false,
			mfaSecret: null,
			mfaRecoveryCodes: [],
		});
	}

	@Post('/verify')
	async verifyMFA(req: MFA.Verify) {
		const { mfaSecret: secret } = req.user;
		const { token } = req.body;

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (!secret) throw new BadRequestError('No MFA secret se for this user');

		const verified = this.mfaService.verifySecret({ secret, token });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');
	}
}
