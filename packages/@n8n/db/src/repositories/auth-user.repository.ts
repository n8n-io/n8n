import { Service } from '@n8n/di';
import type { DeepPartial, EntityManager } from '@n8n/typeorm';
import { DataSource, IsNull, Not, Repository } from '@n8n/typeorm';

import { AuthUser, Project, ProjectRelation } from '../entities';

@Service()
export class AuthUserRepository extends Repository<AuthUser> {
	constructor(dataSource: DataSource) {
		super(AuthUser, dataSource.manager);
	}

	async createUserWithProject(
		user: DeepPartial<AuthUser>,
		transactionManager?: EntityManager,
	): Promise<{ user: AuthUser; project: Project }> {
		const createInner = async (entityManager: EntityManager) => {
			const newUser = entityManager.create(AuthUser, user);
			const savedUser = await entityManager.save<AuthUser>(newUser);
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
