import type { Scope } from '@n8n/permissions';
import { DataSource, In, Repository, Like } from '@n8n/typeorm';
import type { FindManyOptions, FindOptionsWhere } from '@n8n/typeorm';
import { Service } from 'typedi';

import type { ListQuery } from '@/requests';
import { RoleService } from '@/services/role.service';

import { CredentialsEntity } from '../entities/credentials-entity';
import type { User } from '../entities/user';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(
		dataSource: DataSource,
		readonly roleService: RoleService,
	) {
		super(CredentialsEntity, dataSource.manager);
	}

	async findStartingWith(credentialName: string) {
		return await this.find({
			select: ['name'],
			where: { name: Like(`${credentialName}%`) },
		});
	}

	async findMany(
		listQueryOptions?: ListQuery.Options & { includeData?: boolean },
		credentialIds?: string[],
	) {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (listQueryOptions?.includeData) {
			if (Array.isArray(findManyOptions.select)) {
				findManyOptions.select.push('data');
			} else if (typeof findManyOptions.select === 'object') {
				findManyOptions.select.data = true;
			} else {
				findManyOptions.select ??= [];
				findManyOptions.select.push('data');
			}
		}

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		return await this.find(findManyOptions);
	}

	private toFindManyOptions(listQueryOptions?: ListQuery.Options) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const defaultRelations = ['shared', 'shared.project'];
		const defaultSelect: Select = ['id', 'name', 'type', 'createdAt', 'updatedAt'];

		if (!listQueryOptions) return { select: defaultSelect, relations: defaultRelations };

		const { filter, select, take, skip } = listQueryOptions;

		if (typeof filter?.name === 'string' && filter?.name !== '') {
			filter.name = Like(`%${filter.name}%`);
		}

		if (typeof filter?.type === 'string' && filter?.type !== '') {
			filter.type = Like(`%${filter.type}%`);
		}

		if (typeof filter?.projectId === 'string' && filter.projectId !== '') {
			filter.shared = { projectId: filter.projectId };
			delete filter.projectId;
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
			findManyOptions.relations = {
				shared: {
					project: true,
				},
			};
		}

		return await this.find(findManyOptions);
	}

	/**
	 * Find all credentials that are owned by a personal project.
	 */
	async findAllPersonalCredentials(): Promise<CredentialsEntity[]> {
		return await this.findBy({ shared: { project: { type: 'personal' } } });
	}

	/**
	 * Find all credentials that are part of any project that the workflow is
	 * part of.
	 *
	 * This is useful to for finding credentials that can be used in the
	 * workflow.
	 */
	async findAllCredentialsForWorkflow(workflowId: string): Promise<CredentialsEntity[]> {
		return await this.findBy({
			shared: { project: { sharedWorkflows: { workflowId } } },
		});
	}

	/**
	 * Find all credentials that are part of that project.
	 *
	 * This is useful for finding credentials that can be used in workflows that
	 * are part of this project.
	 */
	async findAllCredentialsForProject(projectId: string): Promise<CredentialsEntity[]> {
		return await this.findBy({ shared: { projectId } });
	}

	/**
	 * Find all credentials that the user has access to taking the scopes into
	 * account.
	 *
	 * This also returns `credentials.shared` which is useful for constructing
	 * all scopes the user has for the credential using `RoleService.addScopes`.
	 **/
	async findCredentialsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<CredentialsEntity> = {};

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);
			const credentialRoles = this.roleService.rolesWithScope('credential', scopes);
			where = {
				...where,
				shared: {
					role: In(credentialRoles),
					project: {
						projectRelations: {
							role: In(projectRoles),
							userId: user.id,
						},
					},
				},
			};
		}

		return await this.find({ where, relations: { shared: true } });
	}
}
