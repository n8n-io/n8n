import { TOTP, Secret } from 'otpauth';

export class TOTPService {
	generateSecret(): string {
		return new Secret().base32;
	}

	generateTOTPUri({
		issuer = 'n8n',
		secret,
		label,
	}: {
		secret: string;
		label: string;
		issuer: string;
	}) {
		return new TOTP({
			secret: Secret.fromBase32(secret),
			issuer,
			label,
		}).toString();
	}

	verifySecret({ secret, token, window = 1 }: { secret: string; token: string; window?: number }) {
		return new TOTP({
			secret: Secret.fromBase32(secret),
		}).validate({ secret, token, window }) === null
			? false
			: true;
	}

	generateTOTP(secret: string) {
		return TOTP.generate({
			secret: Secret.fromBase32(secret),
		});
	}
}
