import { Service } from '@n8n/di';
import type { SaveOptions } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { Actor, ServiceAccount, User } from '../entities';
import { TransactionRunner } from '../services/transaction';

/**
 * Loads accounts of both kinds. Each row comes back as the child entity that
 * its `kind` names (`User` or `ServiceAccount`). Use `UserRepository` or
 * `ServiceAccountRepository` when only one kind can appear.
 */
type ActorInstance = User | ServiceAccount;

@Service()
export class ActorRepository extends BaseRepository<Actor> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Actor, dataSource.manager, transactionRunner);
	}

	/*
	 * `Repository.save` writes with the metadata of the repository's entity, so
	 * a save through `Actor` would not set a valid `kind`. The manager takes the
	 * metadata from the class of the instance, so only child instances work.
	 */
	override save<T extends ActorInstance>(
		entities: T[],
		options: SaveOptions & { reload: false },
	): Promise<T[]>;
	override save<T extends ActorInstance>(entities: T[], options?: SaveOptions): Promise<T[]>;
	override save<T extends ActorInstance>(
		entity: T,
		options: SaveOptions & { reload: false },
	): Promise<T>;
	override save<T extends ActorInstance>(entity: T, options?: SaveOptions): Promise<T>;
	override async save<T extends ActorInstance>(
		entityOrEntities: T | T[],
		options?: SaveOptions,
	): Promise<T | T[]> {
		const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
		if (!entities.every((entity) => entity instanceof User || entity instanceof ServiceAccount)) {
			throw new UnexpectedError(
				'ActorRepository.save accepts only User or ServiceAccount instances',
			);
		}
		return await this.manager.save(entityOrEntities, options);
	}
}
