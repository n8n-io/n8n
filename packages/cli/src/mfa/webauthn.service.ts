import { GlobalConfig } from '@n8n/config';
import { UserRepository, WebauthnCredentialRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AuthError } from '@/errors/response-errors/auth.error';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';

@Service()
export class WebAuthnService {
	constructor(
		private readonly webauthnCredentialRepository: WebauthnCredentialRepository,
		private readonly userRepository: UserRepository,
		private readonly cacheService: CacheService,
		private readonly globalConfig: GlobalConfig,
		private readonly urlService: UrlService,
	) {}

	private getRpId(): string {
		const configured = this.globalConfig.mfa.webauthn.rpId;
		if (configured) return configured;
		return new URL(this.urlService.getInstanceBaseUrl()).hostname;
	}

	private getRpName(): string {
		return this.globalConfig.mfa.webauthn.rpName;
	}

	private getOrigin(): string {
		const configured = this.globalConfig.mfa.webauthn.origin;
		if (configured) return configured;
		return new URL(this.urlService.getInstanceBaseUrl()).origin;
	}

	private getChallengeTtlMs(): number {
		return this.globalConfig.mfa.webauthn.challengeTtlMs;
	}

	async generateRegistrationOptions(
		userId: string,
		email: string,
		displayName: string,
		attachment: 'platform' | 'cross-platform',
	) {
		const { generateRegistrationOptions } = await import('@simplewebauthn/server');

		const authenticatorSelection =
			attachment === 'platform'
				? ({
						authenticatorAttachment: 'platform',
						residentKey: 'required',
						userVerification: 'required',
					} as const)
				: ({
						userVerification: 'preferred',
					} as const);

		const existingCredentials = await this.webauthnCredentialRepository.find({
			where: { userId },
		});

		const options = await generateRegistrationOptions({
			rpName: this.getRpName(),
			rpID: this.getRpId(),
			userName: email,
			userDisplayName: displayName || email,
			userID: new TextEncoder().encode(userId),
			attestationType: 'none',
			authenticatorSelection,
			excludeCredentials: existingCredentials.map((c) => ({
				id: c.credentialId,
				...(c.transports?.length && {
					transports: c.transports as NonNullable<
						NonNullable<
							Parameters<typeof generateRegistrationOptions>[0]['excludeCredentials']
						>[number]['transports']
					>,
				}),
			})),
		});

		// Hint the browser at the intended authenticator class. Chrome respects
		// this and skips its platform-passkey dialog when `security-key` is
		// hinted, going straight to the "insert your key" prompt. @simplewebauthn
		// doesn't type the field yet, so attach it post-generation.
		const hint = attachment === 'platform' ? 'client-device' : 'security-key';
		(options as typeof options & { hints: string[] }).hints = [hint];

		await this.cacheService.set(
			`webauthn:challenge:reg:${userId}`,
			options.challenge,
			this.getChallengeTtlMs(),
		);

		return options;
	}

	async verifyRegistrationResponse(
		userId: string,
		response: unknown,
		attachment: 'platform' | 'cross-platform',
	) {
		const { verifyRegistrationResponse } = await import('@simplewebauthn/server');

		const challenge = await this.cacheService.get(`webauthn:challenge:reg:${userId}`);
		if (!challenge) {
			throw new Error('WebAuthn registration challenge expired or not found');
		}

		// Mirror what we asked for in `generateRegistrationOptions`: passkeys must
		// be user-verified (biometric/PIN), but cross-platform security keys can
		// register without UV — many YubiKeys ship without a FIDO2 PIN set.
		const requireUserVerification = attachment === 'platform';

		const verification = await verifyRegistrationResponse({
			response: response as Parameters<typeof verifyRegistrationResponse>[0]['response'],
			expectedChallenge: challenge as string,
			expectedOrigin: this.getOrigin(),
			expectedRPID: this.getRpId(),
			requireUserVerification,
		});

		await this.cacheService.delete(`webauthn:challenge:reg:${userId}`);

		return verification;
	}

	async saveCredential(
		userId: string,
		label: string,
		registrationInfo: {
			credential: {
				id: string;
				publicKey: Uint8Array;
				counter: number;
			};
			credentialDeviceType: string;
			credentialBackedUp: boolean;
			aaguid: string;
		},
		transports?: string[],
	) {
		const { credential, credentialDeviceType, credentialBackedUp, aaguid } = registrationInfo;

		return await this.webauthnCredentialRepository.save(
			this.webauthnCredentialRepository.create({
				userId,
				credentialId: credential.id,
				publicKey: Buffer.from(credential.publicKey),
				counter: credential.counter,
				deviceType: credentialDeviceType,
				backedUp: credentialBackedUp,
				transports: transports ?? null,
				aaguid: aaguid || null,
				label,
			}),
		);
	}

	async generateAuthenticationOptions(userId: string, kind?: 'passkey' | 'security_key') {
		const { generateAuthenticationOptions } = await import('@simplewebauthn/server');

		const allCredentials = await this.webauthnCredentialRepository.find({
			where: { userId },
		});

		// When the caller asks for a specific kind (e.g. re-verify with a passkey
		// when removing one) we narrow `allowCredentials` so the browser/OS can
		// only satisfy the ceremony with a matching credential.
		const filterByKind = (c: (typeof allCredentials)[number]) => {
			if (!kind) return true;
			const isPlatform =
				(c.transports ?? []).includes('internal') || c.deviceType === 'multiDevice';
			return kind === 'passkey' ? isPlatform : !isPlatform;
		};
		const credentials = allCredentials.filter(filterByKind);

		const options = await generateAuthenticationOptions({
			rpID: this.getRpId(),
			allowCredentials: credentials.map((cred) => ({
				id: cred.credentialId,
				transports: (cred.transports ?? undefined) as
					| NonNullable<
							Parameters<typeof generateAuthenticationOptions>[0]['allowCredentials']
					  >[number]['transports']
					| undefined,
			})),
			userVerification: 'preferred',
		});

		await this.cacheService.set(
			`webauthn:challenge:auth:${userId}`,
			options.challenge,
			this.getChallengeTtlMs(),
		);

		return options;
	}

	async verifyAuthenticationResponse(userId: string, response: unknown) {
		const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');

		const challenge = await this.cacheService.get(`webauthn:challenge:auth:${userId}`);
		if (!challenge) {
			throw new Error('WebAuthn authentication challenge expired or not found');
		}

		const authResponse = response as Parameters<typeof verifyAuthenticationResponse>[0]['response'];
		const credentialId = authResponse.id;

		const credential = await this.webauthnCredentialRepository.findOne({
			where: { userId, credentialId },
		});

		if (!credential) {
			throw new Error('WebAuthn credential not found');
		}

		const transports = credential.transports ?? [];
		const isPlatformAuthenticator =
			(transports.length > 0 && transports.every((t) => t === 'internal')) ||
			credential.deviceType === 'multiDevice';
		const requireUserVerification = isPlatformAuthenticator;

		const verification = await verifyAuthenticationResponse({
			response: authResponse,
			expectedChallenge: challenge as string,
			expectedOrigin: this.getOrigin(),
			expectedRPID: this.getRpId(),
			requireUserVerification,
			credential: {
				id: credential.credentialId,
				publicKey: new Uint8Array(credential.publicKey),
				counter: credential.counter,
				transports: (credential.transports ?? undefined) as
					| Parameters<typeof verifyAuthenticationResponse>[0]['credential']['transports']
					| undefined,
			},
		});

		if (verification.verified && verification.authenticationInfo) {
			await this.webauthnCredentialRepository.update(credential.id, {
				counter: verification.authenticationInfo.newCounter,
				lastUsedAt: new Date(),
			});
		}

		await this.cacheService.delete(`webauthn:challenge:auth:${userId}`);

		return verification.verified;
	}

	async generatePasswordlessAuthenticationOptions() {
		const { generateAuthenticationOptions } = await import('@simplewebauthn/server');

		const options = await generateAuthenticationOptions({
			rpID: this.getRpId(),
			allowCredentials: [],
			userVerification: 'required',
		});

		// `hints: ['client-device']` asks the browser to narrow the OS picker to
		// platform passkeys on this device (incl. iCloud Keychain / Google
		// Password Manager). Without it, Chrome also offers "Use a phone or
		// tablet" (hybrid) and "USB security key", which aren't part of the
		// passwordless UX. @simplewebauthn doesn't type the field yet, so we
		// attach it directly to the JSON. Browsers that don't recognise the
		// hint fall back to the full picker — best-effort, not a security
		// boundary.
		(options as typeof options & { hints: string[] }).hints = ['client-device'];

		const challengeId = crypto.randomUUID();
		await this.cacheService.set(
			`webauthn:challenge:passwordless:${challengeId}`,
			options.challenge,
			this.getChallengeTtlMs(),
		);

		return { ...options, challengeId };
	}

	async verifyPasswordlessAuthentication(challengeId: string, response: unknown): Promise<User> {
		const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');

		const cacheKey = `webauthn:challenge:passwordless:${challengeId}`;
		const challenge = await this.cacheService.get(cacheKey);
		if (!challenge) throw new AuthError('Unauthorized');

		const authResponse = response as Parameters<typeof verifyAuthenticationResponse>[0]['response'];
		const credentialId = authResponse.id;

		// Identify the user from the credential row — the signature verification
		// below proves possession of the matching private key, so the credential
		// row's `userId` is the authoritative identity.
		const credential = await this.webauthnCredentialRepository.findOne({
			where: { credentialId },
		});
		if (!credential) throw new AuthError('Unauthorized');

		const verification = await verifyAuthenticationResponse({
			response: authResponse,
			expectedChallenge: challenge as string,
			expectedOrigin: this.getOrigin(),
			expectedRPID: this.getRpId(),
			requireUserVerification: true,
			credential: {
				id: credential.credentialId,
				publicKey: new Uint8Array(credential.publicKey),
				counter: credential.counter,
				transports: (credential.transports ?? undefined) as
					| Parameters<typeof verifyAuthenticationResponse>[0]['credential']['transports']
					| undefined,
			},
		});
		if (!verification.verified || !verification.authenticationInfo) {
			throw new AuthError('Unauthorized');
		}

		await this.webauthnCredentialRepository.update(credential.id, {
			counter: verification.authenticationInfo.newCounter,
			lastUsedAt: new Date(),
		});
		await this.cacheService.delete(cacheKey);

		const user = await this.userRepository.findOne({
			where: { id: credential.userId },
			relations: ['role'],
		});
		if (!user || user.disabled) throw new AuthError('Unauthorized');
		return user;
	}

	async getUserCredentials(userId: string) {
		return await this.webauthnCredentialRepository.find({
			where: { userId },
			order: { createdAt: 'DESC' },
		});
	}

	async deleteCredential(id: string, userId: string) {
		const result = await this.webauthnCredentialRepository.delete({ id, userId });
		return (result.affected ?? 0) > 0;
	}

	async deleteAllUserCredentials(userId: string) {
		await this.webauthnCredentialRepository.delete({ userId });
	}

	async updateCredentialLabel(id: string, userId: string, label: string) {
		await this.webauthnCredentialRepository.update({ id, userId }, { label });
	}

	async hasCredentials(userId: string): Promise<boolean> {
		const count = await this.webauthnCredentialRepository.count({ where: { userId } });
		return count > 0;
	}
}
