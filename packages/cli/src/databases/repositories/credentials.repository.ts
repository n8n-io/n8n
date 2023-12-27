import { Service } from 'typedi';
import {
	DataSource,
	In,
	Not,
	Repository,
	type DeleteResult,
	type EntityManager,
	type FindOptionsWhere,
	Like,
} from 'typeorm';
import { CredentialsEntity } from '../entities/CredentialsEntity';
import { SharedCredentials } from '../entities/SharedCredentials';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(CredentialsEntity, dataSource.manager);
	}

	async pruneSharings(
		transaction: EntityManager,
		credentialId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		const conditions: FindOptionsWhere<SharedCredentials> = {
			credentialsId: credentialId,
			userId: Not(In(userIds)),
		};
		return transaction.delete(SharedCredentials, conditions);
	}

	async findStartingWith(credentialName: string) {
		return this.find({
			select: ['name'],
			where: { name: Like(`${credentialName}%`) },
		});
	}
}
