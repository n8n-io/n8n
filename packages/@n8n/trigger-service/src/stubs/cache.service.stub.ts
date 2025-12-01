/**
 * Stub for CacheService
 * This will be replaced with actual implementation or API calls
 */

import { Service } from '@n8n/di';

@Service()
export class CacheService {
	async get<T>(_key: string): Promise<T | undefined> {
		return undefined;
	}

	async set(_key: string, _value: unknown, _ttl?: number): Promise<void> {
		// no-op
	}

	async delete(_key: string): Promise<void> {
		// no-op
	}

	async reset(): Promise<void> {
		// no-op
	}

	async getMany<T>(_keys: string[]): Promise<Array<T | undefined>> {
		return [];
	}

	async setMany(_items: Array<[key: string, value: unknown]>): Promise<void> {
		// no-op
	}

	// Hash operations
	async setHash(_key: string, _hash: unknown): Promise<void> {
		// no-op
	}

	async getHashValue<T>(_key: string, _field: string): Promise<T | undefined> {
		return undefined;
	}

	async getHash<T>(_key: string): Promise<Record<string, T>> {
		return {} as Record<string, T>;
	}

	async deleteFromHash(_key: string, _field: string): Promise<void> {
		// no-op
	}

	async deleteMany(_keys: string[]): Promise<void> {
		// no-op
	}

	async expire(_key: string, _ttl: number): Promise<void> {
		// no-op
	}
}
