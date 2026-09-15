import type {
	CreatePromotionProviderDto,
	PromotionProviderAuthInput,
	PromotionProviderAuthType,
	PromotionProviderCreatedPublicDto,
	PromotionProviderPublicDto,
	UpdatePromotionProviderDto,
} from '@n8n/api-types';
import { promotionGitSshKeyConfigSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { PromotionProvider } from './database/entities/promotion-provider.entity';
import { PromotionConnectionRepository } from './database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from './database/repositories/promotion-provider.repository';
import { mapPromotionConflicts } from './promotion-conflicts';
import { PromotionsGitService } from './promotions-git.service';
import {
	promotionSshKeyAuthPayloadSchema,
	promotionTokenAuthPayloadSchema,
	type PromotionAuthPayload,
	type PromotionGitCredentials,
} from './promotions.types';

/**
 * Owns provider credentials. One provider can serve several connections, so
 * editing it changes authentication for all of them.
 */
@Service()
export class PromotionProvidersService {
	constructor(
		private readonly providerRepository: PromotionProviderRepository,
		private readonly connectionRepository: PromotionConnectionRepository,
		private readonly gitService: PromotionsGitService,
		private readonly cipher: Cipher,
	) {}

	async create(input: CreatePromotionProviderDto): Promise<PromotionProviderCreatedPublicDto> {
		const { config, auth } = await this.buildAuthentication(input.auth);
		const provider = await this.providerRepository.insertProvider({
			name: input.name,
			type: input.type,
			authType: input.auth.authType,
			config,
			auth,
		});
		return { provider: this.toPublic(provider), publicKey: this.publicKeyOf(provider) };
	}

	async findOne(id: string): Promise<PromotionProviderPublicDto> {
		return this.toPublic(await this.getEntity(id));
	}

	async list(offset: number, limit: number) {
		const { data, count } = await this.providerRepository.listProviders({ offset, limit });
		return { count, data: data.map((provider) => this.toSummary(provider)) };
	}

	/**
	 * Type and auth type are immutable. Leaving `auth` out keeps the stored
	 * credentials; sending it replaces them for every connection on this provider.
	 */
	async update(id: string, input: UpdatePromotionProviderDto): Promise<PromotionProviderPublicDto> {
		if (Object.keys(input).length === 0) {
			throw new BadRequestError('At least one field is required');
		}
		const current = await this.getEntity(id);
		const changes: Partial<Pick<PromotionProvider, 'name' | 'config' | 'auth'>> = {};
		if (input.name !== undefined) changes.name = input.name;

		if (input.auth) {
			if (input.auth.authType !== current.authType) {
				throw new BadRequestError(
					'A provider cannot change its authentication method. Create another provider instead.',
				);
			}
			const requested =
				input.auth.authType === 'ssh-key'
					? { ...input.auth, keyType: input.auth.keyType ?? this.storedKeyType(current) }
					: input.auth;
			const { config, auth } = await this.buildAuthentication(requested);
			changes.config = config;
			changes.auth = auth;
		}

		await this.providerRepository.updateProvider(id, changes);
		return this.toPublic(await this.getEntity(id));
	}

	/**
	 * A provider in use cannot be deleted. The pre-check answers 409 for the normal
	 * case; the foreign key is the final guard when a connection appears in between.
	 */
	async delete(id: string): Promise<void> {
		await this.getEntity(id);
		if ((await this.connectionRepository.countByProviderId(id)) > 0) {
			throw new ConflictError('This provider is used by a connection');
		}
		await mapPromotionConflicts(async () => await this.providerRepository.deleteProvider(id));
	}

	async getEntity(id: string): Promise<PromotionProvider> {
		const provider = await this.providerRepository.findById(id);
		if (!provider) throw new NotFoundError('Promotion provider not found');
		return provider;
	}

	/**
	 * Decrypts the credentials for one Git command. Nothing keeps the result: every
	 * command asks again.
	 */
	async decryptCredentials(source: {
		authType: PromotionProviderAuthType;
		auth: string;
	}): Promise<PromotionGitCredentials> {
		let stored: unknown;
		try {
			stored = jsonParse<unknown>(await this.cipher.decryptV2(source.auth));
		} catch {
			throw unreadableCredentialsError();
		}

		if (source.authType === 'ssh-key') {
			const parsed = promotionSshKeyAuthPayloadSchema.safeParse(stored);
			if (!parsed.success) throw unreadableCredentialsError();
			return { authType: 'ssh-key', privateKey: parsed.data.privateKey };
		}

		const parsed = promotionTokenAuthPayloadSchema.safeParse(stored);
		if (!parsed.success) throw unreadableCredentialsError();
		return {
			authType: 'token',
			username: parsed.data.username,
			password: parsed.data.password,
		};
	}

	toPublic(provider: PromotionProvider): PromotionProviderPublicDto {
		return {
			id: provider.id,
			name: provider.name,
			type: provider.type,
			authType: provider.authType,
			config: provider.config,
			createdAt: provider.createdAt.toISOString(),
			updatedAt: provider.updatedAt.toISOString(),
		};
	}

	/** List rows and embedded providers leave out the public key. */
	toSummary(provider: PromotionProvider) {
		const { config: _, ...summary } = this.toPublic(provider);
		return summary;
	}

	/** Generates or encrypts the credentials for one auth variant. */
	private async buildAuthentication(auth: PromotionProviderAuthInput) {
		if (auth.authType === 'ssh-key') {
			const keyPair = await this.gitService.generateSshKeyPair(auth.keyType);
			return {
				config: { schemaVersion: 1 as const, publicKey: keyPair.publicKey, keyType: auth.keyType },
				auth: await this.encryptPayload({ schemaVersion: 1, privateKey: keyPair.privateKey }),
			};
		}

		this.assertUsableCredentials(auth.username, auth.password);
		return {
			config: { schemaVersion: 1 as const },
			auth: await this.encryptPayload({
				schemaVersion: 1,
				username: auth.username,
				password: auth.password,
			}),
		};
	}

	private async encryptPayload(payload: PromotionAuthPayload) {
		return await this.cipher.encryptV2(JSON.stringify(payload));
	}

	// The Git credential helper reads these line by line, so a newline would split it.
	private assertUsableCredentials(username: string, password: string) {
		if ([username, password].some((value) => /[\r\n\0]/.test(value))) {
			throw new BadRequestError('Credentials contain unsupported characters');
		}
	}

	private publicKeyOf(provider: PromotionProvider): string | null {
		const parsed = promotionGitSshKeyConfigSchema.safeParse(provider.config);
		return parsed.success ? parsed.data.publicKey : null;
	}

	/** Rotating a key keeps the algorithm the provider already uses. */
	private storedKeyType(provider: PromotionProvider) {
		const parsed = promotionGitSshKeyConfigSchema.safeParse(provider.config);
		return parsed.success ? parsed.data.keyType : 'ed25519';
	}
}

/** A row we cannot decrypt or parse. The admin has to replace the credentials. */
function unreadableCredentialsError() {
	return new BadRequestError(
		'The stored provider credentials cannot be read. Update the provider to replace them.',
	);
}
