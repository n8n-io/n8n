import { EntityRepository, FindManyOptions, In, Like } from 'typeorm';
import { CredentialsEntity as Credentials } from '../entities/CredentialsEntity';
import { BaseRepository } from './BaseRepository';

const SELECT_FIELDS: Array<keyof Omit<Credentials, 'data' | 'shared'>> = [
	'id',
	'name',
	'type',
	'nodesAccess',
	'createdAt',
	'updatedAt',
];

export type CredentialsRelation = 'shared' | 'shared.role' | 'shared.user';

@EntityRepository(Credentials)
export class CredentialsRepository extends BaseRepository<Credentials> {
	async findDangling(): Promise<Credentials[]> {
		return this.repository
			.createQueryBuilder('credentials')
			.leftJoinAndSelect('credentials.shared', 'shared')
			.where('shared.credentialsId is null')
			.getMany();
	}

	async getAll(
		relations: CredentialsRelation[] = [],
		ids: Array<Credentials['id']> | undefined = undefined,
	) {
		const options: FindManyOptions<Credentials> = {
			select: SELECT_FIELDS,
			relations,
		};
		if (ids?.length) {
			options.where = { id: In(ids) };
		}
		return this.repository.find(options);
	}

	async findOne(
		id: Credentials['id'],
		relations: CredentialsRelation[] = [],
	): Promise<Credentials | undefined> {
		return this.repository.findOne({ id }, { relations });
	}

	async findOneOrFail(id: Credentials['id']): Promise<Credentials> {
		return this.repository.findOneOrFail({ id });
	}

	async findOneByType(
		id: Credentials['id'],
		type: Credentials['type'],
	): Promise<Credentials | undefined> {
		return this.repository.findOne({ id, type });
	}

	async findOneByTypeOrFail(
		id: Credentials['id'],
		type: Credentials['type'],
	): Promise<Credentials> {
		return this.repository.findOneOrFail({ id, type });
	}

	async findLastMatchingName(name: Credentials['name']): Promise<Credentials[]> {
		return this.repository.find({
			select: ['name' as const],
			where: {
				name: Like(`${name}%`),
			},
		});
	}

	async findAllByNameAndType(
		name: Credentials['name'],
		type: Credentials['type'],
	): Promise<Credentials[]> {
		return this.repository.find({ name, type });
	}
}
