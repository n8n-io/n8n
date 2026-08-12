import {
	BaseRepository,
	TransactionRunner,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFile } from './project-file.entity';
import {
	toActorColumns,
	type ProjectFileActor,
	type ProjectFileListOptions,
} from './project-files.types';

type NewProjectFile = {
	id: string;
	projectId: string;
	name: string;
	mimeType: string;
	fileSizeBytes: number;
	binaryDataId: string;
	actor: ProjectFileActor;
};

type ReplacedContent = {
	binaryDataId: string;
	mimeType: string;
	fileSizeBytes: number;
	actor: ProjectFileActor;
};

@Service()
export class ProjectFileRepository extends BaseRepository<ProjectFile> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ProjectFile, dataSource.manager, transactionRunner);
	}

	async findManyByProjectId(
		projectId: string,
		{ take, skip, search }: ProjectFileListOptions,
		ctx: OperationContext,
	): Promise<[ProjectFile[], number]> {
		const qb = this.managerFor(ctx)
			.createQueryBuilder(ProjectFile, 'file')
			.where('file.projectId = :projectId', { projectId })
			.orderBy('file.updatedAt', 'DESC')
			// Tiebreaker: bulk uploads land in the same millisecond, and without a
			// deterministic second key pagination can repeat or skip rows across pages.
			.addOrderBy('file.id', 'DESC');

		// LOWER() on both sides rather than ILIKE/LIKE: Postgres LIKE is
		// case-sensitive while SQLite's is not, so an unwrapped match would behave
		// differently per driver.
		if (search) {
			qb.andWhere('LOWER(file.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
		}

		if (take !== undefined) qb.take(take);
		if (skip !== undefined) qb.skip(skip);

		return await qb.getManyAndCount();
	}

	async findByIdInProject(
		fileId: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<ProjectFile | null> {
		return await this.managerFor(ctx).findOne(ProjectFile, { where: { id: fileId, projectId } });
	}

	async findByProjectIdAndName(
		projectId: string,
		name: string,
		ctx: OperationContext,
	): Promise<ProjectFile | null> {
		return await this.managerFor(ctx).findOne(ProjectFile, { where: { projectId, name } });
	}

	/** Total bytes stored in one project. */
	async sumSizeByProjectId(projectId: string, ctx: OperationContext): Promise<number> {
		const row = await this.sizeQuery(ctx)
			.where('file.projectId = :projectId', { projectId })
			.getRawOne<{ total: string | number | null }>();

		return Number(row?.total ?? 0);
	}

	/**
	 * Total bytes stored across *all* personal projects on the instance, which
	 * share a single budget.
	 */
	async sumSizeAcrossPersonalProjects(ctx: OperationContext): Promise<number> {
		const row = await this.sizeQuery(ctx)
			.innerJoin('file.project', 'project')
			.where('project.type = :type', { type: 'personal' })
			.getRawOne<{ total: string | number | null }>();

		return Number(row?.total ?? 0);
	}

	/**
	 * Throws {@link ProjectFileNameConflictError} when the `(projectId, name)`
	 * unique index rejects the row — the backstop for two uploads of the same name
	 * racing past the service's existence check.
	 */
	async insertFile({ actor, ...file }: NewProjectFile, ctx: OperationContext): Promise<void> {
		try {
			await this.managerFor(ctx).insert(ProjectFile, {
				...file,
				...toActorColumns(actor, 'createdBy'),
				...toActorColumns(actor, 'updatedBy'),
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new ProjectFileNameConflictError(file.name);
			throw error;
		}
	}

	/**
	 * Compare-and-swap the stored content: the update only lands if the row still
	 * references `previousBinaryDataId`. Returns the rows affected, so the caller
	 * knows whether it won a concurrent overwrite and which blob is now stale.
	 *
	 * A row lock would be the obvious alternative, but `SELECT … FOR UPDATE`
	 * throws on SQLite, so it would be a Postgres-only guarantee.
	 */
	async updateBinaryRefIfUnchanged(
		fileId: string,
		previousBinaryDataId: string,
		{ actor, ...content }: ReplacedContent,
		ctx: OperationContext,
	): Promise<number> {
		const { affected } = await this.managerFor(ctx).update(
			ProjectFile,
			{ id: fileId, binaryDataId: previousBinaryDataId },
			{ ...content, ...toActorColumns(actor, 'updatedBy') },
		);

		// The caller decides which blob to delete from this number, so guessing a
		// default would risk deleting the live one. Fail loudly instead.
		if (affected === null || affected === undefined) {
			throw new UnexpectedError('Database driver did not report affected rows');
		}

		return affected;
	}

	async renameFile(
		fileId: string,
		name: string,
		actor: ProjectFileActor,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).update(
			ProjectFile,
			{ id: fileId },
			{ name, ...toActorColumns(actor, 'updatedBy') },
		);
	}

	async deleteFileById(fileId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(ProjectFile, { id: fileId });
	}

	/** Every binary data reference owned by a project, for blob cleanup. */
	async findAllRefsByProjectId(projectId: string, ctx: OperationContext): Promise<string[]> {
		const rows = await this.managerFor(ctx).find(ProjectFile, {
			where: { projectId },
			select: ['binaryDataId'],
		});

		return rows.map(({ binaryDataId }) => binaryDataId);
	}

	async deleteAllByProjectId(projectId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(ProjectFile, { projectId });
	}

	/**
	 * Re-point every file of one project at another. Takes a raw manager because
	 * it joins the shared transaction owned by `OwnershipTransferService`, whose
	 * handler contract predates `TransactionRunner`.
	 */
	async transferAllToProject(
		fromProjectId: string,
		toProjectId: string,
		trx: EntityManager,
	): Promise<void> {
		await trx.update(ProjectFile, { projectId: fromProjectId }, { projectId: toProjectId });
	}

	private sizeQuery(ctx: OperationContext) {
		return this.managerFor(ctx)
			.createQueryBuilder(ProjectFile, 'file')
			.select('COALESCE(SUM(file.fileSizeBytes), 0)', 'total');
	}
}
