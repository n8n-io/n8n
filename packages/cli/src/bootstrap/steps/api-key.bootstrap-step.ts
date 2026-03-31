import { existsSync, writeFileSync } from 'fs';

import { Logger } from '@n8n/backend-common';
import { BootstrapConfig } from '@n8n/config';
import { ApiKeyRepository, GLOBAL_OWNER_ROLE, UserRepository, QueryFailedError } from '@n8n/db';
import { Service } from '@n8n/di';
import { isApiKeyScope, OWNER_API_KEY_SCOPES, type ApiKeyScope } from '@n8n/permissions';

import { PublicApiKeyService } from '@/services/public-api-key.service';

@Service()
export class ApiKeyBootstrapStep {
	constructor(
		private readonly config: BootstrapConfig,
		private readonly userRepository: UserRepository,
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly publicApiKeyService: PublicApiKeyService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('bootstrap');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.apiKeyLabel) return 'skipped';

		// Resolve the instance owner — must exist (Phase 2 runs first)
		const owner = await this.userRepository.findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});
		if (!owner) {
			this.logger.warn('Bootstrap: API key step skipped — no instance owner found');
			return 'skipped';
		}

		// Idempotency: skip if a key with this label already exists for the owner
		const existing = await this.apiKeyRepository.findOne({
			where: { userId: owner.id, label: this.config.apiKeyLabel, audience: 'public-api' },
			select: { apiKey: true },
		});
		if (existing) {
			// Recover the output file if it was lost (e.g. container restart with new volume)
			if (this.config.apiKeyOutputFile && !existsSync(this.config.apiKeyOutputFile)) {
				this.writeKeyToFile(this.config.apiKeyOutputFile, existing.apiKey);
			}
			return 'skipped';
		}

		// Parse and validate scopes
		const rawScopes = this.config.apiKeyScopes
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		if (rawScopes.length === 0) {
			this.logger.warn('Bootstrap: API key step skipped — N8N_INIT_API_KEY_SCOPES is empty');
			return 'skipped';
		}

		const invalidScopes = rawScopes.filter((s) => !isApiKeyScope(s as ApiKeyScope));
		if (invalidScopes.length > 0) {
			this.logger.warn('Bootstrap: API key step skipped — invalid scope(s)', { invalidScopes });
			return 'skipped';
		}

		const scopes = rawScopes as ApiKeyScope[];

		const nonOwnerScopes = scopes.filter((s) => !OWNER_API_KEY_SCOPES.includes(s));
		if (nonOwnerScopes.length > 0) {
			this.logger.warn('Bootstrap: API key created with non-standard owner scopes', {
				nonOwnerScopes,
			});
		}

		// Create the key
		let record;
		try {
			record = await this.publicApiKeyService.createPublicApiKeyForUser(owner, {
				label: this.config.apiKeyLabel,
				scopes,
				expiresAt: null,
			});
		} catch (error) {
			// Another instance won the race — unique constraint on (userId, label)
			if (error instanceof QueryFailedError) {
				return 'skipped';
			}
			throw error;
		}

		this.logger.info('Bootstrap: API key created', {
			label: this.config.apiKeyLabel,
			apiKey: record.apiKey,
		});

		if (this.config.apiKeyOutputFile) {
			this.writeKeyToFile(this.config.apiKeyOutputFile, record.apiKey);
		}

		return 'created';
	}

	private writeKeyToFile(path: string, key: string): void {
		try {
			writeFileSync(path, key, { encoding: 'utf8', mode: 0o600 });
		} catch (error) {
			this.logger.warn('Bootstrap: failed to write API key to output file', { path, error });
		}
	}
}
