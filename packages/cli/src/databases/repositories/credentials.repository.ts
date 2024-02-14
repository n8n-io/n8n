import { Service } from 'typedi';
import { DataSource, In, Not, Repository, Like } from '@n8n/typeorm';
import type { FindManyOptions, DeleteResult, EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import { CredentialsEntity } from '../entities/CredentialsEntity';
import type { CredentialSharingRole } from '../entities/SharedCredentials';
import { SharedCredentials } from '../entities/SharedCredentials';
import type { ListQuery } from '@/requests';
import type { User } from '../entities/User';
import type { ProjectRole } from '../entities/ProjectRelation';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(CredentialsEntity, dataSource.manager);
	}

	// FIXME: Pruning does not work. Fix it.
	async pruneSharings(
		transaction: EntityManager,
		credentialId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		const conditions: FindOptionsWhere<SharedCredentials> = {
			credentialsId: credentialId,
			project: {
				projectRelations: {
					userId: Not(In(userIds)),
				},
			},
		};
		return await transaction.delete(SharedCredentials, conditions);
	}

	async findStartingWith(credentialName: string) {
		return await this.find({
			select: ['name'],
			where: { name: Like(`${credentialName}%`) },
		});
	}

	async findMany(listQueryOptions?: ListQuery.Options, credentialIds?: string[]) {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		return await this.find(findManyOptions);
	}

	private toFindManyOptions(listQueryOptions?: ListQuery.Options) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const defaultRelations = ['shared.project.projectRelations.user'];
		const defaultSelect: Select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];

		if (!listQueryOptions) return { select: defaultSelect, relations: defaultRelations };

		const { filter, select, take, skip } = listQueryOptions;

		if (typeof filter?.name === 'string' && filter?.name !== '') {
			filter.name = Like(`%${filter.name}%`);
		}

		if (typeof filter?.type === 'string' && filter?.type !== '') {
			filter.type = Like(`%${filter.type}%`);
		}

		if (filter) findManyOptions.where = filter;
		if (select) findManyOptions.select = select;
		if (take) findManyOptions.take = take;
		if (skip) findManyOptions.skip = skip;

		if (take && select && !select?.id) {
			findManyOptions.select = { ...findManyOptions.select, id: true }; // pagination requires id
		}

		if (!findManyOptions.select) {
			findManyOptions.select = defaultSelect;
			findManyOptions.relations = defaultRelations;
		}

		return findManyOptions;
	}

	async getManyByIds(ids: string[], { withSharings } = { withSharings: false }) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = { where: { id: In(ids) } };

		if (withSharings) {
			findManyOptions.relations = ['shared.project.projectRelations.user'];
		}

		return await this.find(findManyOptions);
	}

	getRelationShipOfUserForCredential(
		roleUserToProject: ProjectRole,
		roleProjectToCredential: CredentialSharingRole,
	) {
		// If the user is the admin of the project and the project owns the
		// credential, then they own the credential.
		if (roleUserToProject === 'project:admin' && roleProjectToCredential === 'credential:owner') {
			return 'credential:owner';
		}

		// In all other cases, like the user not being the admin of the
		// project that owns the credential or the project not owning the credential at all, then the user does not own the credential.
		return 'credential:user';
	}

	shouldUserHaveAccess(credential: CredentialsEntity, user: User) {
		const roles = {
			'credential:owner': false,
			'credential:user': false,
		};
		for (const sharedCredential of credential.shared) {
			for (const projectRelation of sharedCredential.project.projectRelations) {
				if (projectRelation.user.id === user.id) {
					// If the user is the admin of the project and the project owns the
					// credential, then they own the credential.
					if (
						projectRelation.role === 'project:personalOwner' &&
						sharedCredential.role === 'credential:owner'
					) {
						roles['credential:owner'] = true;
					}

					// In all other cases, like the user not being the admin of the
					// project that owns the credential or the project not owning the credential at all, then the user does not own the credential.
					roles['credential:user'] = true;
				}
			}
		}

		if (roles['credential:owner']) {
			return 'credential:owner';
		} else if (roles['credential:user']) {
			return 'credential:user';
		} else {
			return false;
		}
	}

	unfurl(credential: CredentialsEntity) {
		// credential.shared[0].project.projectRelations[0].user
		// to
		// credential.shared[0].user

		const shared = [];

		for (const sharedCredential of credential.shared) {
			for (const projectRelation of sharedCredential.project.projectRelations) {
				// only unfurl personal projects
				if (projectRelation.project.type !== 'personal') {
					continue;
				}

				shared.push({
					...sharedCredential,
					user: projectRelation.user,
				});
			}
		}

		return {
			...credential,
			shared,
		};
	}
}

export type OldCredentials = ReturnType<CredentialsRepository['unfurl']>;
