import OTPAuth from 'otpauth';
import { Service } from 'typedi';

@Service()
export class TOTPService {
	generateSecret(): string {
		return new OTPAuth.Secret()?.base32;
	}

	generateTOTPUri({
		issuer = 'n8n',
		secret,
		label,
	}: {
		secret: string;
		label: string;
		issuer?: string;
	}) {
		return new OTPAuth.TOTP({
			secret: OTPAuth.Secret.fromBase32(secret),
			issuer,
			label,
		}).toString();
	}

	verifySecret({ secret, token, window = 2 }: { secret: string; token: string; window?: number }) {
		return new OTPAuth.TOTP({
			secret: OTPAuth.Secret.fromBase32(secret),
		}).validate({ token, window }) === null
			? false
			: true;
	}

	generateTOTP(secret: string) {
		return OTPAuth.TOTP.generate({
			secret: OTPAuth.Secret.fromBase32(secret),
		});
	}
}
