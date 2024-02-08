import { Service } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { TagEntity } from '../entities/TagEntity';
import type { WorkflowEntity } from '../entities/WorkflowEntity';
import intersection from 'lodash/intersection';

@Service()
export class TagRepository extends Repository<TagEntity> {
	constructor(dataSource: DataSource) {
		super(TagEntity, dataSource.manager);
	}

	async findMany(tagIds: string[]) {
		return await this.find({
			select: ['id', 'name'],
			where: { id: In(tagIds) },
		});
	}

	/**
	 * Set tags on workflow to import while ensuring all tags exist in the database,
	 * either by matching incoming to existing tags or by creating them first.
	 */
	async setTags(tx: EntityManager, dbTags: TagEntity[], workflow: WorkflowEntity) {
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
	 * Returns the workflow IDs that have certain tags.
	 * Intersection! e.g. workflow needs to have all provided tags.
	 */
	async getWorkflowIdsViaTags(tags: string[]): Promise<string[]> {
		const dbTags = await this.find({
			where: { name: In(tags) },
			relations: ['workflows'],
		});

		const workflowIdsPerTag = dbTags.map((tag) => tag.workflows.map((workflow) => workflow.id));

		return intersection(...workflowIdsPerTag);
	}
}
