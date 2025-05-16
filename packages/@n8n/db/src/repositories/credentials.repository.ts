import { Service } from '@n8n/di';
import { DataSource, In, Repository, Like } from '@n8n/typeorm';
import type { FindManyOptions } from '@n8n/typeorm';

import { CredentialsEntity } from '../entities';
import type { User } from '../entities';
import type { ListQuery } from '../entities/types-db';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(CredentialsEntity, dataSource.manager);
	}

	async findStartingWith(credentialName: string) {
		return await this.find({
			select: ['name'],
			where: { name: Like(`${credentialName}%`) },
		});
	}

	async findMany(
		listQueryOptions?: ListQuery.Options & { includeData?: boolean; user?: User },
		credentialIds?: string[],
	) {
		const findManyOptions = this.toFindManyOptions(listQueryOptions);

		if (credentialIds) {
			findManyOptions.where = { ...findManyOptions.where, id: In(credentialIds) };
		}

		return await this.find(findManyOptions);
	}

	private toFindManyOptions(listQueryOptions?: ListQuery.Options & { includeData?: boolean }) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const defaultRelations = ['shared', 'shared.project', 'shared.project.projectRelations'];
		const defaultSelect: Select = ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'];

		if (!listQueryOptions) return { select: defaultSelect, relations: defaultRelations };

		const { filter, select, take, skip } = listQueryOptions;

		if (typeof filter?.name === 'string' && filter?.name !== '') {
			filter.name = Like(`%${filter.name}%`);
		}

		if (typeof filter?.type === 'string' && filter?.type !== '') {
			filter.type = Like(`%${filter.type}%`);
		}

		this.handleSharedFilters(listQueryOptions);

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

		if (listQueryOptions.includeData) {
			if (Array.isArray(findManyOptions.select)) {
				findManyOptions.select.push('data');
			} else {
				findManyOptions.select.data = true;
			}
		}

		return findManyOptions;
	}

	private handleSharedFilters(
		listQueryOptions?: ListQuery.Options & { includeData?: boolean },
	): void {
		if (!listQueryOptions?.filter) return;

		const { filter } = listQueryOptions;

		if (typeof filter.projectId === 'string' && filter.projectId !== '') {
			filter.shared = {
				projectId: filter.projectId,
			};
			delete filter.projectId;
		}

		if (typeof filter.withRole === 'string' && filter.withRole !== '') {
			filter.shared = {
				...(filter?.shared ? filter.shared : {}),
				role: filter.withRole,
			};
			delete filter.withRole;
		}

		if (
			filter.user &&
			typeof filter.user === 'object' &&
			'id' in filter.user &&
			typeof filter.user.id === 'string'
		) {
			filter.shared = {
				...(filter?.shared ? filter.shared : {}),
				project: {
					projectRelations: {
						userId: filter.user.id,
					},
				},
			};
			delete filter.user;
		}
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
}
