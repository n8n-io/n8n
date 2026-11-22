import { BaseRepository, generateNanoId, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import type { StoredInput, StoredRequest } from '../../edit-classifier';
import { CustomActionRevisionEntity } from '../entities/custom-action-revision.entity';
import { CustomActionVersionEntity } from '../entities/custom-action-version.entity';
import { CustomActionEntity } from '../entities/custom-action.entity';

class CustomActionTable extends BaseRepository<CustomActionEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(CustomActionEntity, dataSource.manager, transactionRunner);
	}
}

/**
 * The fields a caller supplies to insert a custom action. The repository makes the id.
 * Set exactly one of `parentNodeType` and `customNodeId`.
 */
export type NewCustomAction = Pick<CustomActionEntity, 'name' | 'parentNodeType' | 'customNodeId'> &
	Partial<Pick<CustomActionEntity, 'description' | 'createdById'>>;

export interface NewVersion {
	inputs: StoredInput[];
}

export interface NewRevision {
	request: StoredRequest;
	changeNote?: string;
	createdById: string;
}

export interface ActionVersionAggregate {
	id: number;
	version: number;
	inputs: StoredInput[];
	currentRevision: number;
	revisionCount: number;
	/** The request of the current revision. */
	request: StoredRequest;
	createdAt: Date;
}

export interface ActionAggregate {
	action: CustomActionEntity;
	/** Sorted ascending by `version`. */
	versions: ActionVersionAggregate[];
}

@Service()
export class CustomActionRepository {
	private readonly table: CustomActionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new CustomActionTable(dataSource, transactionRunner);
	}

	/** Inserts the action with version 1 and revision 1. Returns the id of the action. */
	async insertAction(
		action: NewCustomAction,
		version: NewVersion,
		revision: NewRevision,
		ctx: OperationContext,
	): Promise<string> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const id = generateNanoId();
			await manager.insert(CustomActionEntity, {
				id,
				name: action.name,
				description: action.description ?? null,
				parentNodeType: action.parentNodeType,
				customNodeId: action.customNodeId,
				createdById: action.createdById ?? null,
				updatedById: action.createdById ?? null,
			});
			await this.insertVersion(manager, id, 1, version, revision);
			return id;
		});
	}

	async findAllActions(ctx: OperationContext): Promise<ActionAggregate[]> {
		return await this.loadAggregates(this.table.managerFor(ctx));
	}

	async findAction(id: string, ctx: OperationContext): Promise<ActionAggregate | null> {
		const [aggregate] = await this.loadAggregates(this.table.managerFor(ctx), id);
		return aggregate ?? null;
	}

	async updateActionMeta(
		id: string,
		meta: { name: string; description?: string; updatedById: string },
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(
				CustomActionEntity,
				{ id },
				{ name: meta.name, description: meta.description ?? null, updatedById: meta.updatedById },
			);
	}

	/** Replaces the inputs in place. Use it only for a cosmetic edit. */
	async updateVersionInputs(
		versionId: number,
		inputs: StoredInput[],
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(CustomActionVersionEntity, { id: versionId }, { inputs });
	}

	/** Appends the next revision and makes it the current revision. Returns its number. */
	async appendRevision(
		versionId: number,
		revision: NewRevision,
		ctx: OperationContext,
	): Promise<number> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const latest = await manager.maximum(CustomActionRevisionEntity, 'revision', { versionId });
			const next = (latest ?? 0) + 1;
			// The unique index on (versionId, revision) rejects a concurrent append with the same number.
			await this.insertRevision(manager, versionId, next, revision);
			await manager.update(CustomActionVersionEntity, { id: versionId }, { currentRevision: next });
			return next;
		});
	}

	/** Appends the next version with revision 1. Returns the version number. */
	async appendVersion(
		actionId: string,
		version: NewVersion,
		revision: NewRevision,
		ctx: OperationContext,
	): Promise<number> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const latest = await manager.maximum(CustomActionVersionEntity, 'version', { actionId });
			const next = (latest ?? 0) + 1;
			// The unique index on (actionId, version) rejects a concurrent append with the same number.
			await this.insertVersion(manager, actionId, next, version, revision);
			return next;
		});
	}

	/** The caller checks that the revision exists. */
	async setCurrentRevision(
		versionId: number,
		revision: number,
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(CustomActionVersionEntity, { id: versionId }, { currentRevision: revision });
	}

	async countRevisions(versionId: number, ctx: OperationContext): Promise<number> {
		return await this.table.managerFor(ctx).countBy(CustomActionRevisionEntity, { versionId });
	}

	/** The database deletes the versions and revisions of the action (CASCADE). */
	async deleteAction(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(CustomActionEntity, { id });
	}

	private async insertVersion(
		manager: EntityManager,
		actionId: string,
		versionNumber: number,
		version: NewVersion,
		revision: NewRevision,
	): Promise<void> {
		const { id } = await manager.save(
			manager.create(CustomActionVersionEntity, {
				actionId,
				version: versionNumber,
				inputs: version.inputs,
				currentRevision: 1,
			}),
		);
		await this.insertRevision(manager, id, 1, revision);
	}

	private async insertRevision(
		manager: EntityManager,
		versionId: number,
		revisionNumber: number,
		revision: NewRevision,
	): Promise<void> {
		// `save` because the insert type of TypeORM rejects the `unknown` values of the request body.
		await manager.save(
			manager.create(CustomActionRevisionEntity, {
				versionId,
				revision: revisionNumber,
				request: revision.request,
				changeNote: revision.changeNote ?? null,
				createdById: revision.createdById,
			}),
		);
	}

	/** Loads actions with all versions, the revision count and the current request of each version. */
	private async loadAggregates(
		manager: EntityManager,
		actionId?: string,
	): Promise<ActionAggregate[]> {
		const actions = await manager.find(CustomActionEntity, {
			where: actionId === undefined ? {} : { id: actionId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		if (actions.length === 0) return [];

		const versions = await manager.find(CustomActionVersionEntity, {
			where: actionId === undefined ? {} : { actionId },
			order: { actionId: 'ASC', version: 'ASC' },
		});

		const revisionsQuery = manager
			.createQueryBuilder(CustomActionRevisionEntity, 'r')
			.innerJoin(CustomActionVersionEntity, 'v', 'v.id = r.versionId');
		if (actionId !== undefined) {
			revisionsQuery.where('v.actionId = :actionId', { actionId });
		}

		const counts = await revisionsQuery
			.clone()
			.select('r.versionId', 'versionId')
			.addSelect('COUNT(*)', 'count')
			.groupBy('r.versionId')
			.getRawMany<{ versionId: number | string; count: number | string }>();
		const countByVersion = new Map(counts.map((row) => [Number(row.versionId), Number(row.count)]));

		const currentRevisions = await revisionsQuery
			.andWhere('r.revision = v.currentRevision')
			.getMany();
		const requestByVersion = new Map(currentRevisions.map((row) => [row.versionId, row.request]));

		const versionsByAction = new Map<string, ActionVersionAggregate[]>();
		for (const version of versions) {
			const request = requestByVersion.get(version.id);
			if (request === undefined) {
				throw new UnexpectedError('Custom action version has no current revision', {
					extra: { versionId: version.id, currentRevision: version.currentRevision },
				});
			}
			const list = versionsByAction.get(version.actionId) ?? [];
			list.push({
				id: version.id,
				version: version.version,
				inputs: version.inputs,
				currentRevision: version.currentRevision,
				revisionCount: countByVersion.get(version.id) ?? 0,
				request,
				createdAt: version.createdAt,
			});
			versionsByAction.set(version.actionId, list);
		}

		return actions.map((action) => ({ action, versions: versionsByAction.get(action.id) ?? [] }));
	}
}
