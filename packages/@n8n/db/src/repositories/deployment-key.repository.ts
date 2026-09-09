import { Service } from '@n8n/di';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';
import { Cipher } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { DeploymentKey } from '../entities/deployment-key';
import { DbLock, DbLockService } from '../services/db-lock.service';

/**
 * Marker for signing-secret rows whose value is wrapped with the instance
 * key. Rows without it hold the value in the original stored form.
 */
const SECRET_WRAP_ALGORITHM = 'aes-256-gcm';

export type DeploymentKeySortField = 'createdAt' | 'updatedAt' | 'status';
export type DeploymentKeySortDirection = 'ASC' | 'DESC';

export type ListDeploymentKeysOptions = {
	type?: string;
	sortField: DeploymentKeySortField;
	sortDirection: DeploymentKeySortDirection;
	skip: number;
	take: number;
	createdAtFrom?: Date;
	createdAtTo?: Date;
};

@Service()
export class DeploymentKeyRepository extends Repository<DeploymentKey> {
	constructor(
		dataSource: DataSource,
		private readonly dbLockService: DbLockService,
		private readonly cipher: Cipher,
	) {
		super(DeploymentKey, dataSource.manager);
	}

	/**
	 * Reads the active signing secret of the given type and returns it in
	 * usable form. Storage format is this repository's concern: a row marked
	 * with {@link SECRET_WRAP_ALGORITHM} is unwrapped with the instance key.
	 *
	 * With `rewrapLegacy`, a row found in the original stored form is
	 * rewritten in place to the wrapped form. The conditional update keys on
	 * `algorithm IS NULL`, so concurrent instances upgrading the same row
	 * cannot double-wrap it, and the returned secret is identical either way.
	 * The flag exists because not every reader may write: one-off CLI commands
	 * must not mutate deployment state and may run with read-only DB
	 * credentials, so callers opt into the rewrite explicitly.
	 */
	async findActiveSigningSecret(
		type: string,
		{ rewrapLegacy = false }: { rewrapLegacy?: boolean } = {},
	): Promise<string | null> {
		const row = await this.findActiveByType(type);
		if (!row) return null;
		if (row.algorithm === SECRET_WRAP_ALGORITHM) {
			try {
				return this.cipher.decryptDEKWithInstanceKey(row.value);
			} catch {
				throw new UnexpectedError(
					`Deployment key '${type}' cannot be read with this instance encryption key`,
				);
			}
		}
		// Only the pre-wrap form (algorithm NULL) may pass through as-is; any
		// other marker means a format this version cannot read — fail loudly
		// instead of handing ciphertext to the caller as if it were the secret.
		if (row.algorithm !== null) {
			throw new UnexpectedError(
				`Deployment key '${type}' has an unsupported storage format '${row.algorithm}'`,
			);
		}
		if (rewrapLegacy) {
			await this.update(
				{ id: row.id, algorithm: IsNull() },
				{
					value: this.cipher.encryptDEKWithInstanceKey(row.value),
					algorithm: SECRET_WRAP_ALGORITHM,
				},
			);
		}
		return row.value;
	}

	/**
	 * Inserts an active signing secret of the given type in wrapped form.
	 * On a unique-index conflict (concurrent multi-main startup) the insert is
	 * silently ignored; the caller should read the winner's value afterwards.
	 */
	async seedSigningSecret(type: string, secret: string): Promise<void> {
		await this.insertOrIgnore({
			type,
			value: this.cipher.encryptDEKWithInstanceKey(secret),
			status: 'active',
			algorithm: SECRET_WRAP_ALGORITHM,
		});
	}

	/**
	 * Seeds the legacy aes-256-cbc data-encryption row exactly once. The
	 * check and insert run inside a `DbLock` critical section, so mains
	 * starting concurrently cannot create duplicate rows.
	 */
	async seedLegacyCbcKey(encryptedValue: string): Promise<void> {
		await this.dbLockService.withLock(DbLock.DATA_ENCRYPTION_KEY_SEED, async (tx) => {
			const repo = tx.getRepository(DeploymentKey);
			const existing = await repo.findOne({
				where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
			});
			if (existing) return;
			// a create()-built entity instance, so the @BeforeInsert id hook runs
			// (a plain object literal would skip it and violate the NOT NULL id)
			await repo.save(
				repo.create({
					type: 'data_encryption',
					value: encryptedValue,
					algorithm: 'aes-256-cbc',
					status: 'inactive',
				}),
			);
		});
	}

	async findActiveByType(type: string): Promise<DeploymentKey | null> {
		return await this.findOne({ where: { type, status: 'active' } });
	}

	async findAllByType(type: string): Promise<DeploymentKey[]> {
		return await this.find({ where: { type } });
	}

	async findDataEncryptionKeys(): Promise<DeploymentKey[]> {
		return await this.find({ where: { type: 'data_encryption' } });
	}

	async rewrapLegacyDataEncryptionValue(
		id: string,
		oldValue: string,
		wrappedValue: string,
	): Promise<void> {
		await this.update({ id, type: 'data_encryption', value: oldValue }, { value: wrappedValue });
	}

	async findAndCountForList(
		opts: ListDeploymentKeysOptions,
	): Promise<{ items: DeploymentKey[]; count: number }> {
		const qb = this.createQueryBuilder('deploymentKey');

		if (opts.type) {
			qb.andWhere('deploymentKey.type = :type', { type: opts.type });
		}

		if (opts.createdAtFrom && opts.createdAtTo) {
			qb.andWhere('deploymentKey.createdAt BETWEEN :from AND :to', {
				from: opts.createdAtFrom,
				to: opts.createdAtTo,
			});
		} else if (opts.createdAtFrom) {
			qb.andWhere('deploymentKey.createdAt >= :from', { from: opts.createdAtFrom });
		} else if (opts.createdAtTo) {
			qb.andWhere('deploymentKey.createdAt <= :to', { to: opts.createdAtTo });
		}

		qb.orderBy(`deploymentKey.${opts.sortField}`, opts.sortDirection);

		// Stable secondary sort so pagination is deterministic when ties occur.
		if (opts.sortField !== 'createdAt') {
			qb.addOrderBy('deploymentKey.createdAt', 'DESC');
		}
		qb.addOrderBy('deploymentKey.id', 'ASC');

		qb.skip(opts.skip).take(opts.take);

		const [items, count] = await qb.getManyAndCount();
		return { items, count };
	}

	/**
	 * Inserts the entity if no active row with that type exists yet.
	 * On a unique-index conflict (concurrent multi-main startup), the insert
	 * is silently ignored. The caller should read the winner's value afterwards.
	 */
	async insertOrIgnore(
		entityData: Pick<DeploymentKey, 'type' | 'value' | 'status' | 'algorithm'>,
	): Promise<void> {
		const entity = this.create(entityData);
		await this.createQueryBuilder().insert().values(entity).orIgnore().execute();
	}

	/** Atomically deactivates any existing active key of the same type, then saves the given entity as active. */
	async insertAsActive(entity: DeploymentKey & { status: 'active' }): Promise<DeploymentKey> {
		return await this.manager.transaction(async (tx) => {
			await tx.update(
				DeploymentKey,
				{ type: entity.type, status: 'active' },
				{ status: 'inactive' },
			);
			return await tx.save(DeploymentKey, entity);
		});
	}

	/** Atomically deactivates any existing active key of the given type, then sets the target key as active. */
	async promoteToActive(id: string, type: string): Promise<void> {
		await this.manager.transaction(async (tx) => {
			const target = await tx.findOne(DeploymentKey, { where: { id, type } });
			if (!target) {
				throw new Error(`Deployment key '${id}' of type '${type}' not found`);
			}
			await tx.update(DeploymentKey, { type, status: 'active' }, { status: 'inactive' });
			await tx.update(DeploymentKey, { id, type }, { status: 'active' });
		});
	}

	// Deployment keys must never be deleted: data encrypted with a key becomes
	// unreadable without it. Keys are deactivated instead (`markInactive` /
	// `promoteToActive`). These parameterless shadows close the inherited
	// TypeORM delete surface twice over — calls with arguments no longer
	// type-check, and any call throws at runtime. Call sites are additionally
	// rejected in CI by `n8n-local-rules/no-deployment-key-delete`.

	async delete(): Promise<never> {
		throw new UnexpectedError('Deployment keys must never be deleted — deactivate them instead');
	}

	async remove(): Promise<never> {
		throw new UnexpectedError('Deployment keys must never be deleted — deactivate them instead');
	}

	async softDelete(): Promise<never> {
		throw new UnexpectedError('Deployment keys must never be deleted — deactivate them instead');
	}

	async softRemove(): Promise<never> {
		throw new UnexpectedError('Deployment keys must never be deleted — deactivate them instead');
	}

	async clear(): Promise<never> {
		throw new UnexpectedError('Deployment keys must never be deleted — deactivate them instead');
	}
}
