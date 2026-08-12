import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import {
	KNOWLEDGE_DEFAULT_COLLECTION_NAME,
	KNOWLEDGE_MODULE_NAME,
	KNOWLEDGE_SETTINGS_KEY,
} from './knowledge.constants';

export interface KnowledgeSettings {
	embedding: { provider: 'openai'; credentialId: string; model: string } | null;
	vectorStore: { provider: 'qdrant'; credentialId: string; collectionName: string } | null;
}

export interface KnowledgeSettingsPatch {
	embedding?: KnowledgeSettings['embedding'];
	/** `collectionName` may be omitted; it falls back to {@link KNOWLEDGE_DEFAULT_COLLECTION_NAME}. */
	vectorStore?: { provider: 'qdrant'; credentialId: string; collectionName?: string } | null;
}

const embeddingSchema = z.object({
	provider: z.literal('openai'),
	credentialId: z.string().min(1),
	model: z.string().min(1),
});

const vectorStoreSchema = z.object({
	provider: z.literal('qdrant'),
	credentialId: z.string().min(1),
	collectionName: z.string().min(1),
});

const knowledgeSettingsSchema = z.object({
	embedding: embeddingSchema.nullable(),
	vectorStore: vectorStoreSchema.nullable(),
});

const defaultSettings = (): KnowledgeSettings => ({ embedding: null, vectorStore: null });

/**
 * Instance-level admin settings for knowledge connectors, persisted as a single
 * JSON row in the shared `settings` table.
 */
@Service()
export class KnowledgeSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped(KNOWLEDGE_MODULE_NAME);
	}

	async getSettings(): Promise<KnowledgeSettings> {
		const row = await this.settingsRepository.findByKey(KNOWLEDGE_SETTINGS_KEY);

		if (!row?.value) return defaultSettings();

		const parsed = knowledgeSettingsSchema.safeParse(
			jsonParse<unknown>(row.value, { fallbackValue: null }),
		);

		if (!parsed.success) {
			this.logger.warn('Stored knowledge settings are unreadable, falling back to defaults', {
				issues: parsed.error.issues,
			});

			return defaultSettings();
		}

		return parsed.data;
	}

	/** Fields absent from `patch` keep their stored value; passing `null` clears one. */
	async updateSettings(patch: KnowledgeSettingsPatch): Promise<KnowledgeSettings> {
		const current = await this.getSettings();

		const next: KnowledgeSettings = {
			embedding: patch.embedding === undefined ? current.embedding : patch.embedding,
			vectorStore:
				patch.vectorStore === undefined
					? current.vectorStore
					: patch.vectorStore === null
						? null
						: {
								...patch.vectorStore,
								collectionName:
									patch.vectorStore.collectionName ?? KNOWLEDGE_DEFAULT_COLLECTION_NAME,
							},
		};

		const validated = knowledgeSettingsSchema.parse(next);

		// Not loaded on startup: these settings are read on demand by this module only.
		await this.settingsRepository.upsertByKey(
			KNOWLEDGE_SETTINGS_KEY,
			JSON.stringify(validated),
			false,
			{},
		);

		return validated;
	}

	async isConfigured(): Promise<boolean> {
		const { embedding, vectorStore } = await this.getSettings();

		return embedding !== null && vectorStore !== null;
	}
}
