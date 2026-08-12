import type { ListProjectFilesQueryDto } from '@n8n/api-types';
import { withTransaction, type ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, In, Repository, SelectQueryBuilder } from '@n8n/typeorm';

import { ProjectFile } from './project-file.entity';
import type { FileStorageSizeData } from './types';

/** Column each `sortBy` field maps to; `size` sorts the denormalized byte count. */
const SORTABLE_COLUMNS = {
	name: 'name',
	createdAt: 'createdAt',
	updatedAt: 'updatedAt',
	size: 'fileSizeBytes',
} as const;

@Service()
export class ProjectFileRepository extends Repository<ProjectFile> {
	constructor(dataSource: DataSource) {
		super(ProjectFile, dataSource.manager);
	}

	async getManyAndCount(options: Partial<ListProjectFilesQueryDto>) {
		const query = this.getManyQuery(options);
		const [data, count] = await query.getManyAndCount();
		return { count, data };
	}

	async findById(fileId: string): Promise<ProjectFile | null> {
		return await this.findOneBy({ id: fileId });
	}

	async findByIdInProject(fileId: string, projectId: string): Promise<ProjectFile | null> {
		return await this.findOneBy({ id: fileId, projectId });
	}

	async findByNameInProject(name: string, projectId: string): Promise<ProjectFile | null> {
		return await this.findOneBy({ name, projectId });
	}

	async findAllByProjectId(projectId: string): Promise<ProjectFile[]> {
		return await this.findBy({ projectId });
	}

	async findSummariesByIds(
		ids: string[],
	): Promise<Array<Pick<ProjectFile, 'id' | 'name' | 'projectId'>>> {
		if (ids.length === 0) return [];

		return await this.find({
			select: ['id', 'name', 'projectId'],
			where: { id: In(ids) },
		});
	}

	async insertFile(
		file: Pick<
			ProjectFile,
			'projectId' | 'name' | 'storedAt' | 'storageKey' | 'mimeType' | 'fileSizeBytes'
		>,
	): Promise<ProjectFile> {
		const entity = this.create(file);
		return await this.save(entity);
	}

	/**
	 * Atomically repoints a row at freshly written bytes (the replace flow).
	 * The old key is not touched here; the orphan sweeper reclaims it.
	 */
	async swapStorageRef(
		fileId: string,
		ref: Pick<ProjectFile, 'storedAt' | 'storageKey' | 'mimeType' | 'fileSizeBytes'>,
	): Promise<void> {
		await this.update({ id: fileId }, { ...ref, updatedAt: new Date() });
	}

	async renameFile(fileId: string, name: string): Promise<void> {
		await this.update({ id: fileId }, { name, updatedAt: new Date() });
	}

	async deleteByIdsInProject(fileIds: string[], projectId: string): Promise<void> {
		if (fileIds.length === 0) return;

		await this.delete({ id: In(fileIds), projectId });
	}

	/** Every persisted storage key for one backend — the sweeper's live set. */
	async findAllStorageKeys(storedAt: ExecutionDataStorageLocation): Promise<string[]> {
		const rows = await this.find({ select: ['storageKey'], where: { storedAt } });
		return rows.map((row) => row.storageKey);
	}

	async getTotalSizeBytes(): Promise<FileStorageSizeData> {
		const result = await this.createQueryBuilder('projectFile')
			.select('SUM(projectFile.fileSizeBytes)', 'total')
			.getRawOne<{ total: string | number | null }>();

		return { totalBytes: Number(result?.total ?? 0) };
	}

	/**
	 * Moves every file row to the target project, auto-suffixing names that
	 * collide there. Bytes do not move — storage keys are opaque and persisted.
	 */
	async transferAllToProject(
		fromProjectId: string,
		toProjectId: string,
		trx?: EntityManager,
	): Promise<void> {
		await withTransaction(this.manager, trx, async (em) => {
			const files = await em.findBy(ProjectFile, { projectId: fromProjectId });
			if (files.length === 0) return;

			const targetFiles = await em.findBy(ProjectFile, { projectId: toProjectId });
			const takenNames = new Set(targetFiles.map((file) => file.name));

			for (const file of files) {
				let { name } = file;
				for (let i = 1; takenNames.has(name); i++) {
					name = this.suffixedName(file.name, i);
				}
				takenNames.add(name);

				await em.update(ProjectFile, { id: file.id }, { projectId: toProjectId, name });
			}
		});
	}

	/** `report.csv` → `report (1).csv`, keeping the extension in place. */
	suffixedName(name: string, counter: number): string {
		const dotIndex = name.lastIndexOf('.');
		const hasExtension = dotIndex > 0 && dotIndex < name.length - 1;
		const base = hasExtension ? name.slice(0, dotIndex) : name;
		const extension = hasExtension ? name.slice(dotIndex) : '';
		return `${base} (${counter})${extension}`.slice(0, 255);
	}

	private getManyQuery(
		options: Partial<ListProjectFilesQueryDto>,
	): SelectQueryBuilder<ProjectFile> {
		const query = this.createQueryBuilder('projectFile');

		query
			.leftJoinAndSelect('projectFile.project', 'project')
			.select(['projectFile', ...this.getProjectFields('project')]);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		query.skip(options.skip ?? 0);
		if (options.take !== undefined) query.take(options.take);

		return query;
	}

	private applyFilters(
		query: SelectQueryBuilder<ProjectFile>,
		filter: Partial<ListProjectFilesQueryDto>['filter'],
	): void {
		for (const field of ['id', 'projectId'] as const) {
			const content = [filter?.[field]].flat().filter((value) => value !== undefined);
			if (content.length === 0) continue;

			query.andWhere(`projectFile.${field} IN (:...${field}s)`, { [field + 's']: content });
		}

		if (filter?.name) {
			const nameFilters = Array.isArray(filter.name) ? filter.name : [filter.name];

			nameFilters.forEach((name, i) => {
				query.andWhere(`LOWER(projectFile.name) LIKE LOWER(:name${i})`, {
					['name' + i]: `%${name}%`,
				});
			});
		}
	}

	private applySorting(query: SelectQueryBuilder<ProjectFile>, sortBy?: string): void {
		if (!sortBy) {
			query.orderBy('projectFile.updatedAt', 'DESC');
			return;
		}

		const [field, order] = sortBy.split(':');
		const column = SORTABLE_COLUMNS[field as keyof typeof SORTABLE_COLUMNS] ?? 'updatedAt';
		query.orderBy(`projectFile.${column}`, order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC');
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}
}
