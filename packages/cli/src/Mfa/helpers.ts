import { User } from '@/databases/entities/User';
import * as speakeasy from 'speakeasy';

export const validateMfaToken = (user: User, mfaToken: string) => {
	return speakeasy.totp.verify({
		secret: user.mfaSecret ?? '',
		encoding: 'base32',
		token: mfaToken,
	});
};
