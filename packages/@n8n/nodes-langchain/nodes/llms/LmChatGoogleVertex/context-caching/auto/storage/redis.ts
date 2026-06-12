import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { createClient, type RedisClientOptions } from 'redis';

import {
	type ContextCacheMetadata,
	parseContextCacheMetadata,
	serializeContextCacheMetadata,
} from '../context-cache-metadata';
import type {
	ContextCacheMetadataStorage,
	ContextCacheMetadataTtlOptions,
} from './context-cache-metadata-storage';

/** Matches `createClient()` return type without pinning Redis module generics. */
type RedisClientInstance = ReturnType<typeof createClient>;

const REDIS_KEY_SEGMENT_MAX = 200;

function sanitizeKeySegment(value: string, fallback: string): string {
	const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, REDIS_KEY_SEGMENT_MAX);
	return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeHashSegment(hash: string): string {
	const h = hash.replace(/[^a-fA-F0-9]/g, '').slice(0, 128);
	return h.length > 0 ? h : 'invalid';
}

/**
 * Namespace segment: `{userPrefix}:{workflowId}:{parentNodeId}`.
 * Full Redis key: `{baseKey}:{hash}`.
 */
export function buildVertexContextCacheRedisBaseKey(
	userPrefix: string,
	workflowId: string,
	parentNodeId: string,
): string {
	const p = userPrefix.trim();
	const wf = sanitizeKeySegment(workflowId, 'unknown');
	const par = sanitizeKeySegment(parentNodeId, 'unknown');
	return `${p}:${wf}:${par}`;
}

function redisKeyForHash(baseKey: string, hash: string): string {
	return `${baseKey}:${sanitizeHashSegment(hash)}`;
}

async function quitRedisClientSafely(client: RedisClientInstance): Promise<void> {
	try {
		await client.quit();
	} catch {
		await client.disconnect();
	}
}

export async function connectRedisClientForVertexCache(
	credentials: ICredentialDataDecryptedObject,
	nodeTypeVersion: number,
): Promise<RedisClientInstance> {
	const options: RedisClientOptions = {
		socket: {
			host: credentials.host as string,
			port: credentials.port as number,
			tls: credentials.ssl === true,
		},
		database: credentials.database as number,
	};

	if (credentials.user && nodeTypeVersion >= 1.5) {
		options.username = credentials.user as string;
	}
	if (credentials.password) {
		options.password = credentials.password as string;
	}

	const client = createClient(options);
	await client.connect();
	return client;
}

/**
 * Redis-backed {@link ContextCacheMetadataStorage}. Opens a connection per operation and closes it
 * in `finally`, so metadata writes cannot race with supply teardown of a shared client.
 */
export class RedisContextCacheMetadataStorage implements ContextCacheMetadataStorage {
	constructor(
		private readonly credentials: ICredentialDataDecryptedObject,
		private readonly nodeTypeVersion: number,
		private readonly baseKey: string,
	) {}

	private key(hash: string): string {
		return redisKeyForHash(this.baseKey, hash);
	}

	private async withClient<T>(fn: (client: RedisClientInstance) => Promise<T>): Promise<T> {
		const client = await connectRedisClientForVertexCache(this.credentials, this.nodeTypeVersion);
		try {
			return await fn(client);
		} finally {
			await quitRedisClientSafely(client);
		}
	}

	async delete(hash: string): Promise<void> {
		await this.withClient(async (client) => {
			await client.del(this.key(hash));
		});
	}

	async read(hash: string): Promise<ContextCacheMetadata | null> {
		return await this.withClient(async (client) => {
			const raw = await client.get(this.key(hash));
			if (raw === null) {
				return null;
			}
			const meta = parseContextCacheMetadata(raw);
			if (meta === null) {
				await client.del(this.key(hash));
				return null;
			}
			return meta;
		});
	}

	async write(
		hash: string,
		metadata: import('../context-cache-metadata').ContextCacheMetadata,
		options: ContextCacheMetadataTtlOptions,
	): Promise<void> {
		const ttl = Math.max(1, Math.floor(options.ttlSeconds));
		await this.withClient(async (client) => {
			await client.set(this.key(hash), serializeContextCacheMetadata(metadata), { EX: ttl });
		});
	}

	async writeIfAbsent(
		hash: string,
		metadata: ContextCacheMetadata,
		options: ContextCacheMetadataTtlOptions,
	): Promise<boolean> {
		const ttl = Math.max(1, Math.floor(options.ttlSeconds));
		return await this.withClient(async (client) => {
			const reply = await client.set(this.key(hash), serializeContextCacheMetadata(metadata), {
				EX: ttl,
				NX: true,
			});
			return reply !== null;
		});
	}
}
