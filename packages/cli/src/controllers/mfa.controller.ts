import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import { AuthenticatedRequest, MFA } from '@/requests';
import { MfaService } from '@/Mfa/mfa.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

import { Response } from 'express';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { CredentialDeviceType } from '@simplewebauthn/server/script/deps';
import { AuthService } from '@/auth/auth.service';
import { UserService } from '@/services/user.service';

let challenge = '';

let credentialId: Uint8Array;

let credentialPublickey: Uint8Array;

let credentialDevicetype: CredentialDeviceType;

let credentialBackedup: boolean;

let securityKeys: Array<{
	rawId: string;
	id: string;
	credentialId: Uint8Array;
	credentialPublicKey: Uint8Array;
	credentialDevicetype: CredentialDeviceType;
	label?: string;
}> = [];

@RestController('/mfa')
export class MFAController {
	constructor(
		private mfaService: MfaService,
		private userRepository: UserRepository,
		private authService: AuthService,
		private userService: UserService,
	) {}

	@Get('/security-keys')
	async getSecurityKeys(req: AuthenticatedRequest, res: Response) {
		return securityKeys.map((securityKey) => ({
			id: securityKey.id,
			label: securityKey.label ?? '',
		}));
	}

	@Delete('/security-keys/:id')
	async deleteSecurityKeys(req: AuthenticatedRequest, res: Response) {
		const index = securityKeys.findIndex((securityKey) => securityKey.id === req.params.id);
		securityKeys.splice(index, 1);
		return;
	}

	@Patch('/security-keys/:id')
	async updateSecurityKeyName(req: AuthenticatedRequest, res: Response) {
		const index = securityKeys.findIndex((securityKey) => securityKey.id === req.params.id);
		//@ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		securityKeys[index].label = req.body.label;
		return;
	}

	@Get('/challenge')
	async getChallenge(req: AuthenticatedRequest, res: Response) {
		// const challenge = Math.random().toString(36).substring(2);

		const options = await SimpleWebAuthnServer.generateRegistrationOptions({
			rpName: 'n8n',
			rpID: 'localhost',
			userID: '123',
			userName: 'ricardo123',
			// Don't prompt users for additional information about the authenticator
			// (Recommended for smoother UX)
			attestationType: 'none',
			excludeCredentials: securityKeys.map((securityKey) => ({
				id: securityKey.credentialId,
				type: 'public-key',
			})),
			// attestationFormat: 'fido-u2f',
			// Prevent users from re-registering existing authenticators
			// See "Guiding use of authenticators via authenticatorSelection" below
			authenticatorSelection: {
				// Defaults
				residentKey: 'preferred',
				userVerification: 'preferred',
				// Optional
				authenticatorAttachment: 'cross-platform',
			},
		});

		challenge = options.challenge;

		return options;
	}

	@Post('/verify-challenge')
	async verifyChallenge(req: AuthenticatedRequest, res: Response) {
		console.log('este es el session');
		console.log(SimpleWebAuthnServer);

		console.log(req.body);

		// const verified = await SimpleWebAuthnServer.verifyRegistrationResponse({
		// 	response: req.body,
		// 	expectedChallenge: challenge,
		// 	expectedOrigin: 'http://localhost:8080',
		// 	// expectedRPID: 'localhost',
		// });

		const verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
			//@ts-ignore
			response: req.body,
			expectedChallenge: challenge,
			expectedOrigin: 'http://localhost:8080',
			expectedRPID: 'localhost',
			requireUserVerification: false,
		});

		// console.log(verification);

		if (verification.verified && verification.registrationInfo) {
			const {
				credentialPublicKey,
				credentialID,
				counter,
				credentialDeviceType,
				credentialBackedUp,
			} = verification.registrationInfo;
			// console.log(new TextDecoder().decode(credentialID));
			// console.log(credentialPublicKey);
			// console.log(credentialPublicKey.toString());
			// console.log(credentialID.toString());
			// console.log(counter);

			// console.log(isoUint8Array.toHex(credentialPublicKey));
			// console.log(isoUint8Array.toHex(credentialID));
			// console.log(isoUint8Array.toUTF8String(credentialID));
			// console.log(counter);

			// credentialId = credentialID;
			// credentialPublickey = credentialPublicKey;
			// credentialBackedup = credentialBackedUp;
			// credentialDevicetype = credentialDeviceType;

			await this.userRepository.update(req.user.id, { mfaEnabled: true });

			securityKeys.push({
				id: isoUint8Array.toHex(credentialID),
				credentialId: credentialID,
				credentialPublicKey,
				credentialDevicetype: credentialDeviceType,
			});
		}

		return { verified: verification.verified };
	}

	@Get('/start-authentication', { skipAuth: true })
	async startAuthentication(req: AuthenticatedRequest, res: Response) {
		const allowCredentials = securityKeys.map((securityKey) => ({
			id: securityKey.credentialId,
			type: 'public-key',
			transport: [],
		})) as PublicKeyCredentialDescriptor[];

		// const challenge = Math.random().toString(36).substring(2);

		// const user = await this.userRepository.findOne({ where: {} });

		const options = await SimpleWebAuthnServer.generateAuthenticationOptions({
			rpID: 'localhost',
			// Require users to use a previously-registered authenticator
			allowCredentials,
			userVerification: 'preferred',
		});

		challenge = options.challenge;

		console.log('devolviendo challengue');

		console.log(challenge);

		return options;
	}

	@Post('/verify-authentication', { skipAuth: true })
	async verifyAuthentication(req: AuthenticatedRequest, res: Response) {
		const user = await this.userRepository.findOne({ where: {}, relations: ['authIdentities'] });

		if (!user) {
			throw new BadRequestError('User not found');
		}

		for (const securityKey of securityKeys) {
			const verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
				//@ts-ignore
				response: req.body,
				expectedChallenge: challenge,
				expectedOrigin: 'http://localhost:8080',
				expectedRPID: 'localhost',
				requireUserVerification: false,
				authenticator: {
					credentialID: securityKey.credentialId,
					credentialPublicKey: securityKey.credentialPublicKey,
					counter: 0,
				},
			});

			if (verification.verified) {
				this.authService.issueCookie(res, user, req.browserId);
				return await this.userService.toPublic(user, { withScopes: true });
			}
		}

		return {};
	}

	@Get('/qr')
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

	@Post('/enable')
	async activateMFA(req: MFA.Activate) {
		const { token = null } = req.body;
		const { id, mfaEnabled } = req.user;

		const { decryptedSecret: secret, decryptedRecoveryCodes: recoveryCodes } =
			await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (mfaEnabled) throw new BadRequestError('MFA already enabled');

		if (!secret || !recoveryCodes.length) {
			throw new BadRequestError('Cannot enable MFA without generating secret and recovery codes');
		}

		const verified = this.mfaService.totp.verifySecret({ secret, token, window: 10 });

		if (!verified)
			throw new BadRequestError('MFA token expired. Close the modal and enable MFA again', 997);

		await this.mfaService.enableMfa(id);
	}

	@Delete('/disable')
	async disableMFA(req: AuthenticatedRequest) {
		const { id } = req.user;

		await this.mfaService.disableMfa(id);
	}

	@Post('/verify')
	async verifyMFA(req: MFA.Verify) {
		const { id } = req.user;
		const { token } = req.body;

		const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(id);

		if (!token) throw new BadRequestError('Token is required to enable MFA feature');

		if (!secret) throw new BadRequestError('No MFA secret se for this user');

		const verified = this.mfaService.totp.verifySecret({ secret, token });

		if (!verified) throw new BadRequestError('MFA secret could not be verified');
	}
}
