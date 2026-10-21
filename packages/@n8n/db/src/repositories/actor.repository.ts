import { Service } from '@n8n/di';
import type { SaveOptions } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { Actor, ServiceAccount, User } from '../entities';
import { TransactionRunner } from '../services/transaction';

type ActorInstance = User | ServiceAccount;

@Service()
export class ActorRepository extends BaseRepository<Actor> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Actor, dataSource.manager, transactionRunner);
	}

	/*
	 * A save takes the `kind` from the class of the instance. A plain object has
	 * no child class, so TypeORM would write the discriminator of `Actor`.
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

	/** Inserts skip the class of the instance and write the `Actor` discriminator. */
	override async insert(): Promise<never> {
		throw new UnexpectedError('Use UserRepository or ServiceAccountRepository to insert');
	}

	override async upsert(): Promise<never> {
		throw new UnexpectedError('Use UserRepository or ServiceAccountRepository to upsert');
	}
}
