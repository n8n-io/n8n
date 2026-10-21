import { Service } from '@n8n/di';
import type { DeepPartial, SaveOptions } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Actor } from '../entities';
import { TransactionRunner } from '../services/transaction';

/**
 * Loads accounts of both kinds. Each row comes back as the child entity that
 * its `kind` names (`User` or `ServiceAccount`). Use `UserRepository` or
 * `ServiceAccountRepository` when only one kind can appear.
 */
@Service()
export class ActorRepository extends BaseRepository<Actor> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Actor, dataSource.manager, transactionRunner);
	}

	/*
	 * `Repository.save` writes with the metadata of the repository's entity, so
	 * a save through `Actor` would not set a valid `kind`. The manager takes the
	 * metadata from the class of the instance. Pass a `User` or a
	 * `ServiceAccount` instance, not a plain object.
	 */
	override save<T extends DeepPartial<Actor>>(
		entities: T[],
		options: SaveOptions & { reload: false },
	): Promise<T[]>;
	override save<T extends DeepPartial<Actor>>(
		entities: T[],
		options?: SaveOptions,
	): Promise<Array<T & Actor>>;
	override save<T extends DeepPartial<Actor>>(
		entity: T,
		options: SaveOptions & { reload: false },
	): Promise<T>;
	override save<T extends DeepPartial<Actor>>(entity: T, options?: SaveOptions): Promise<T & Actor>;
	override async save<T extends DeepPartial<Actor>>(
		entityOrEntities: T | T[],
		options?: SaveOptions,
	): Promise<T | T[]> {
		return await this.manager.save(entityOrEntities, options);
	}
}
