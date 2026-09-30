import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import {
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type SurfaceId,
	type TrustedSourceConfigInput,
	type TrustedSourceConfigLatest,
} from '@n8n/inbound-auth';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { Cipher } from 'n8n-core';
import { jsonParse, UserError } from 'n8n-workflow';

import type {
	TrustedSourceEntity,
	TrustedSourceManagedBy,
	TrustedSourceStatus,
	TrustedSourceType,
} from './database/entities/trusted-source.entity';
import { TrustedSourceIdentityRepository } from './database/repositories/trusted-source-identity.repository';
import {
	TrustedSourceRepository,
	type TrustedSourceRowChanges,
} from './database/repositories/trusted-source.repository';
import { TransactionRunner } from '@n8n/db';
import { Time } from '@n8n/constants';
import { CacheService } from '@n8n/backend-services';

/**
 * A trusted source as consumers see it: decrypted, validated and migrated to the latest config
 * version. Dates are ISO strings so the shape survives a Redis round-trip unchanged.
 */
export type TrustedSource = {
	id: string;
	name: string;
	type: TrustedSourceType;
	issuer: string;
	managedBy: TrustedSourceManagedBy;
	status: TrustedSourceStatus;
	lastError: string | null;
	lastCheckedAt: string | null;
	createdAt: string;
	updatedAt: string;
	config: TrustedSourceConfigLatest;
};

/** The store still validates `config`: the admin-vs-system rules depend on the row, not the type. */
export type CreateTrustedSourceInput = {
	name: string;
	issuer: string;
	config: TrustedSourceConfigInput;
};
export type UpdateTrustedSourceInput = Partial<CreateTrustedSourceInput>;

export class SystemTrustedSourceModificationError extends UserError {
	constructor(action: 'update' | 'delete') {
		super(`Cannot ${action} a system-managed trusted source.`);
	}
}

const idKey = (id: string) => `trusted-source:id:${id}`;
const issuerKey = (issuer: string) => `trusted-source:issuer:${issuer}`;
const ALL_KEY = 'trusted-source:all';
// Reads are look-aside, so a read that started before a concurrent write can re-cache the old
// row after the write invalidated it. We accept that; this TTL caps the stale window at 5 minutes.
const CACHE_TTL = 5 * Time.minutes.toMilliseconds;

@Service()
export class TrustedSourceStore {
	constructor(
		private readonly logger: Logger,
		private readonly trustedSourceRepository: TrustedSourceRepository,
		private readonly cipher: Cipher,
		private readonly cacheService: CacheService,
		private readonly trustedSourceIdentityRepository: TrustedSourceIdentityRepository,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async getById(id: string): Promise<TrustedSource | undefined> {
		return await this.cacheService.get(idKey(id), {
			ttl: CACHE_TTL,
			refreshFn: async () => await this.load(await this.trustedSourceRepository.findById(id)),
		});
	}

	async getByIssuer(issuer: string): Promise<TrustedSource | undefined> {
		return await this.cacheService.get(issuerKey(issuer), {
			ttl: CACHE_TTL,
			refreshFn: async () =>
				await this.load(await this.trustedSourceRepository.findByIssuer(issuer)),
		});
	}

	async listBySurface(surface: SurfaceId): Promise<TrustedSource[]> {
		const allSources =
			(await this.cacheService.get(ALL_KEY, {
				ttl: CACHE_TTL,
				refreshFn: async () => await this.loadAll(),
			})) ?? [];
		return allSources.filter((source) => source.config.surfaces[surface] !== undefined);
	}

	async create(input: CreateTrustedSourceInput): Promise<TrustedSource> {
		// Persist the parsed, migrated output, not the raw input: stored rows hold the latest version
		// with defaults filled in, so a later default change must not alter them.
		const config = migrateToLatest(trustedSourceConfigSchemaFor('admin').parse(input.config));
		const row = await this.trustedSourceRepository.insertRow({
			name: input.name,
			issuer: input.issuer,
			type: config.authentication.type,
			managedBy: 'admin',
			status: 'unchecked',
			lastError: null,
			lastCheckedAt: null,
			configVersion: config.version,
			config: await this.cipher.encryptV2(config),
		});
		await this.invalidateCache(row);
		return this.toRuntime(row, config);
	}

	async update(
		id: string,
		input: UpdateTrustedSourceInput,
		options?: { clearBindings: boolean },
	): Promise<void> {
		const row = await this.loadAdminRow(id, 'update');
		const changes: TrustedSourceRowChanges = {};
		if (input.name !== undefined) changes.name = input.name;
		if (input.issuer !== undefined) changes.issuer = input.issuer;
		if (input.config !== undefined) {
			const config = migrateToLatest(
				trustedSourceConfigSchemaFor(row.managedBy).parse(input.config),
			);
			changes.configVersion = config.version;
			changes.config = await this.cipher.encryptV2(config);
		}
		await this.transactionRunner.run({}, async (ctx) => {
			if (Object.keys(changes).length > 0) {
				await this.trustedSourceRepository.updateById(id, changes, ctx);
			}
			// After the row write, so a failed update does not drop bindings.
			if (options?.clearBindings) {
				await this.trustedSourceIdentityRepository.clearByTrustedSourceId(id, ctx);
			}
		});
		await this.invalidateCache(row, changes.issuer);
	}

	async delete(id: string): Promise<void> {
		const row = await this.loadAdminRow(id, 'delete');
		await this.trustedSourceRepository.deleteById(id); // identities go with it via FK cascade
		await this.invalidateCache(row);
	}

	private async loadAdminRow(id: string, action: 'update' | 'delete') {
		const row = await this.trustedSourceRepository.findById(id);
		if (!row) throw new NotFoundError(`Trusted source "${id}" not found`);
		if (row.managedBy === 'system') throw new SystemTrustedSourceModificationError(action);
		return row;
	}

	/** `row` is the state before the write, so `row.issuer` is the old issuer. */
	private async invalidateCache(row: TrustedSourceEntity, newIssuer = row.issuer) {
		await this.cacheService.deleteMany([
			idKey(row.id),
			issuerKey(row.issuer),
			issuerKey(newIssuer),
			ALL_KEY,
		]);
	}

	/** Any failure makes the row unusable: warn and skip it. Reads never write. */
	private async load(row: TrustedSourceEntity | null): Promise<TrustedSource | undefined> {
		if (!row) return undefined;
		try {
			const document = jsonParse<unknown>(await this.cipher.decryptV2(row.config));
			const config = trustedSourceConfigSchemaFor(row.managedBy).parse(document);
			return this.toRuntime(row, migrateToLatest(config));
		} catch (error) {
			this.logger.warn('Skipping unusable trusted source', {
				id: row.id,
				reason: ensureError(error).message,
			});
			return undefined;
		}
	}

	private async loadAll(): Promise<TrustedSource[]> {
		const rows = await this.trustedSourceRepository.findAll();
		const sources = await Promise.all(rows.map(async (row) => await this.load(row)));
		return sources.filter((source): source is TrustedSource => source !== undefined);
	}

	private toRuntime(row: TrustedSourceEntity, config: TrustedSourceConfigLatest): TrustedSource {
		return {
			id: row.id,
			name: row.name,
			type: row.type,
			issuer: row.issuer,
			managedBy: row.managedBy,
			status: row.status,
			lastError: row.lastError,
			lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			config,
		};
	}
}
