import type { User } from '@/databases/entities/User';
import * as speakeasy from 'speakeasy';

export const validateMfaToken = (user: User, mfaToken: string) => {
	return speakeasy.totp.verify({
		secret: user.mfaSecret ?? '',
		encoding: 'base32',
		token: mfaToken,
	});
};

export const validateMfaRecoveryCode = (user: User, mfaRecoveryCode: string) => {
	if (user?.mfaRecoveryCodes) {
		const recoveryCodes = user.mfaRecoveryCodes.split('|');
		if (recoveryCodes.includes(mfaRecoveryCode)) {
			return true;
		}
	}
	return false;
};
