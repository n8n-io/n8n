import { GlobalConfig } from '@n8n/config';
import { WebauthnCredentialRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';

@Service()
export class WebAuthnService {
	constructor(
		private readonly webauthnCredentialRepository: WebauthnCredentialRepository,
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
		existingCredentialIds: string[],
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
						authenticatorAttachment: 'cross-platform',
						residentKey: 'discouraged',
						userVerification: 'preferred',
					} as const);

		const options = await generateRegistrationOptions({
			rpName: this.getRpName(),
			rpID: this.getRpId(),
			userName: email,
			attestationType: 'none',
			excludeCredentials: existingCredentialIds.map((id) => ({ id })),
			authenticatorSelection,
		});

		await this.cacheService.set(
			`webauthn:challenge:reg:${userId}`,
			options.challenge,
			this.getChallengeTtlMs(),
		);

		return options;
	}

	async verifyRegistrationResponse(userId: string, response: unknown) {
		const { verifyRegistrationResponse } = await import('@simplewebauthn/server');

		const challenge = await this.cacheService.get(`webauthn:challenge:reg:${userId}`);
		if (!challenge) {
			throw new Error('WebAuthn registration challenge expired or not found');
		}

		const verification = await verifyRegistrationResponse({
			response: response as Parameters<typeof verifyRegistrationResponse>[0]['response'],
			expectedChallenge: challenge as string,
			expectedOrigin: this.getOrigin(),
			expectedRPID: this.getRpId(),
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
		},
		transports?: string[],
	) {
		const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

		return await this.webauthnCredentialRepository.save(
			this.webauthnCredentialRepository.create({
				userId,
				credentialId: credential.id,
				publicKey: Buffer.from(credential.publicKey),
				counter: credential.counter,
				deviceType: credentialDeviceType,
				backedUp: credentialBackedUp,
				transports: transports ?? null,
				label,
			}),
		);
	}

	async generateAuthenticationOptions(userId: string) {
		const { generateAuthenticationOptions } = await import('@simplewebauthn/server');

		const credentials = await this.webauthnCredentialRepository.find({
			where: { userId },
		});

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

		const verification = await verifyAuthenticationResponse({
			response: authResponse,
			expectedChallenge: challenge as string,
			expectedOrigin: this.getOrigin(),
			expectedRPID: this.getRpId(),
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
			});
		}

		await this.cacheService.delete(`webauthn:challenge:auth:${userId}`);

		return verification.verified;
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
