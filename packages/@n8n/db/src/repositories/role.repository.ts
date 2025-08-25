import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { Role } from '../entities';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(
		dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {
		super(Role, dataSource.manager);
	}

	async findAll() {
		return await this.find();
	}

	async findBySlug(slug: string) {
		return await this.findOne({ where: { slug } });
	}

	async removeBySlug(slug: string) {
		const result = await this.delete({ slug });
		if (result.affected !== 1) {
			throw new Error(`Failed to delete role "${slug}"`);
		}
	}

	private async updateEntityWithManager(
		entityManager: EntityManager,
		slug: string,
		newData: Partial<Pick<Role, 'description' | 'scopes' | 'displayName'>>,
	) {
		const role = await entityManager.findOneBy(Role, { slug });
		if (!role) {
			throw new Error('Role not found');
		}
		if (role.systemRole) {
			throw new Error('Cannot update system roles');
		}
		Object.assign(role, newData);
		return await entityManager.save<Role>(role);
	}

	async updateRole(
		slug: string,
		newData: Partial<Pick<Role, 'description' | 'scopes' | 'displayName'>>,
	) {
		// Do not use transactions for sqlite legacy
		if (this.databaseConfig.isLegacySqlite) {
			return await this.updateEntityWithManager(this.manager, slug, newData);
		}
		return await this.manager.transaction(async (transactionManager) => {
			return await this.updateEntityWithManager(transactionManager, slug, newData);
		});
	}
}
