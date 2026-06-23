import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse, randomString } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type {
	ResolvedSourceConnection,
	SourceConnection,
	StoredSourceConnection,
} from './source-connection.types';

const SETTINGS_KEY = 'promotionReviewPrototype.sourceConnections';

export interface AddSourceConnectionInput {
	name: string;
	baseUrl: string;
	apiKey: string;
}

/**
 * Holds the consuming instance's source connections (which producing instances
 * it pulls from). Persisted in the `settings` table; the API key is encrypted at
 * rest. This is the consuming-side half of the pairing step.
 */
@Service()
export class PromotionSourceConnectionService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
	) {}

	async list(): Promise<SourceConnection[]> {
		return (await this.readAll()).map(toPublic);
	}

	async add(input: AddSourceConnectionInput): Promise<SourceConnection> {
		const connections = await this.readAll();
		const stored: StoredSourceConnection = {
			id: randomString(16),
			name: input.name,
			baseUrl: input.baseUrl.replace(/\/+$/, ''),
			createdAt: new Date().toISOString(),
			encryptedApiKey: this.cipher.encrypt(input.apiKey),
		};
		connections.push(stored);
		await this.writeAll(connections);
		return toPublic(stored);
	}

	async delete(id: string): Promise<void> {
		const connections = await this.readAll();
		const next = connections.filter((connection) => connection.id !== id);
		if (next.length === connections.length) {
			throw new NotFoundError(`Source connection not found: ${id}`);
		}
		await this.writeAll(next);
	}

	/** Resolve a connection with its decrypted key, for pulling over the wire. */
	async resolve(id: string): Promise<ResolvedSourceConnection> {
		const stored = (await this.readAll()).find((connection) => connection.id === id);
		if (!stored) {
			throw new NotFoundError(`Source connection not found: ${id}`);
		}
		return { ...toPublic(stored), apiKey: this.cipher.decrypt(stored.encryptedApiKey) };
	}

	private async readAll(): Promise<StoredSourceConnection[]> {
		const setting = await this.settingsRepository.findByKey(SETTINGS_KEY);
		if (!setting?.value) return [];
		return jsonParse<StoredSourceConnection[]>(setting.value, { fallbackValue: [] });
	}

	private async writeAll(connections: StoredSourceConnection[]): Promise<void> {
		await this.settingsRepository.save(
			{ key: SETTINGS_KEY, value: JSON.stringify(connections), loadOnStartup: false },
			{ transaction: false },
		);
	}
}

function toPublic(stored: StoredSourceConnection): SourceConnection {
	const { encryptedApiKey: _encryptedApiKey, ...rest } = stored;
	return rest;
}
