import { Service } from 'typedi';
import { DataSource, Repository, In, IsNull, Not } from '@n8n/typeorm';
import type { DeepPartial, EntityManager, FindOptionsWhere } from '@n8n/typeorm';

import { AuthUser } from '../entities/AuthUser';
import { Project } from '../entities/Project';
import { ProjectRelation } from '../entities/ProjectRelation';

@Service()
export class AuthUserRepository extends Repository<AuthUser> {
	constructor(dataSource: DataSource) {
		super(AuthUser, dataSource.manager);
	}

	/** This returns a user object with all columns, including the ones marked as `select: false` */
	async findForAuth(where: FindOptionsWhere<AuthUser>, includeRelations = false) {
		return await this.findOne({
			where,
			relations: includeRelations ? ['authIdentities'] : undefined,
		});
	}

	async findManyByIds(userIds: string[]) {
		return await this.find({
			where: { id: In(userIds) },
		});
	}

	async createUserWithProject(
		user: DeepPartial<AuthUser>,
		transactionManager?: EntityManager,
	): Promise<{ user: AuthUser; project: Project }> {
		const createInner = async (entityManager: EntityManager) => {
			const newUser = entityManager.create(AuthUser, user);
			const savedUser = await entityManager.save(newUser);
			const savedProject = await entityManager.save<Project>(
				entityManager.create(Project, {
					type: 'personal',
					name: savedUser.createPersonalProjectName(),
				}),
			);
			await entityManager.save<ProjectRelation>(
				entityManager.create(ProjectRelation, {
					projectId: savedProject.id,
					userId: savedUser.id,
					role: 'project:personalOwner',
				}),
			);
			return { user: savedUser, project: savedProject };
		};
		if (transactionManager) {
			return await createInner(transactionManager);
		}
		// TODO: use a transactions
		// This is blocked by TypeORM having concurrency issues with transactions
		return await createInner(this.manager);
	}

	async findNonShellUser(email: string) {
		return await this.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities'],
		});
	}
}
