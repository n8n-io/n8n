import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import intersection from 'lodash/intersection';

import { FolderTagMapping, TagEntity, WorkflowTagMapping } from '../entities';
import { BaseRepository } from './base-repository';
import type { IWorkflowDb } from '../entities/types-db';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

@Service()
export class TagRepository extends BaseRepository<TagEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TagEntity, dataSource.manager, transactionRunner);
	}

	async findMany(tagIds: string[]) {
		return await this.find({
			select: ['id', 'name'],
			where: { id: In(tagIds) },
		});
	}

	/** Exact (case-sensitive) name lookup; no input normalization. */
	async findManyByName(names: string[]) {
		return await this.find({
			select: ['id', 'name'],
			where: { name: In(names) },
		});
	}

	/**
	 * Set tags on workflow to import while ensuring all tags exist in the database,
	 * either by matching incoming to existing tags or by creating them first.
	 */
	async setTags(tx: EntityManager, dbTags: TagEntity[], workflow: IWorkflowDb) {
		if (!workflow?.tags?.length) return;

		for (let i = 0; i < workflow.tags.length; i++) {
			const importTag = workflow.tags[i];

			if (!importTag.name) continue;

			const identicalMatch = dbTags.find(
				(dbTag) =>
					dbTag.id === importTag.id &&
					dbTag.createdAt &&
					importTag.createdAt &&
					dbTag.createdAt.getTime() === new Date(importTag.createdAt).getTime(),
			);

			if (identicalMatch) {
				workflow.tags[i] = identicalMatch;
				continue;
			}

			const nameMatch = dbTags.find((dbTag) => dbTag.name === importTag.name);

			if (nameMatch) {
				workflow.tags[i] = nameMatch;
				continue;
			}

			const tagEntity = this.create(importTag);

			workflow.tags[i] = await tx.save<TagEntity>(tagEntity);
		}
	}

	/**
	 * Re-keys a tag from `oldId` to `newId`, carrying its name, `createdAt`,
	 * and every workflow and folder mapping over. The mapping FKs are
	 * ON UPDATE NO ACTION, so the id cannot be updated in place while mappings
	 * exist: instead the new row is inserted first (the old row moves to a
	 * random temporary name to free the unique name index), the mappings are
	 * re-pointed with set-based updates, and the then-childless old row is
	 * deleted. `ctx` must carry an active transaction so a failure at any
	 * statement rolls everything back.
	 */
	async reconcileTagId(oldId: string, newId: string, ctx: OperationContext) {
		const tx = this.managerFor(ctx);
		const oldTag = await tx.findOneByOrFail(TagEntity, { id: oldId });
		await tx.update(TagEntity, { id: oldId }, { name: generateNanoId() });
		await tx.insert(TagEntity, { id: newId, name: oldTag.name, createdAt: oldTag.createdAt });
		await tx.update(WorkflowTagMapping, { tagId: oldId }, { tagId: newId });
		await tx.update(FolderTagMapping, { tagId: oldId }, { tagId: newId });
		await tx.delete(TagEntity, { id: oldId });
	}

	/**
	 * Returns the workflow IDs that have certain tags.
	 * Intersection! e.g. workflow needs to have all provided tags.
	 */
	async getWorkflowIdsViaTags(tags: string[]): Promise<string[]> {
		const dbTags = await this.find({
			where: { name: In(tags) },
			relations: ['workflows'],
			select: {
				id: true,
				workflows: {
					id: true,
				},
			},
		});

		const workflowIdsPerTag = dbTags.map((tag) => tag.workflows.map((workflow) => workflow.id));

		return intersection(...workflowIdsPerTag);
	}
}
