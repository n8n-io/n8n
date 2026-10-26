import { In } from '@n8n/typeorm';
import type { EntityManager, FindOptionsRelations, FindOptionsWhere } from '@n8n/typeorm';

import { chunkIds } from './chunk-ids';
import { SharedWorkflow } from '../entities/shared-workflow';
import { TagEntity } from '../entities/tag-entity';
import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowTagMapping } from '../entities/workflow-tag-mapping';

/**
 * The workflow relations that hold several rows per workflow. Joining one of them onto a
 * workflow row repeats every workflow column, including the `nodes` and `connections` JSON
 * and a joined `activeVersion`, once per related row. Joining both repeats them once per
 * tag and share combination.
 */
export type WorkflowCollections = {
	tags?: boolean;
	/** `{ project: true }` also loads each share's project. */
	shared?: boolean | { project: boolean };
};

type WorkflowRelations = FindOptionsRelations<WorkflowEntity>;
type WorkflowWhere = FindOptionsWhere<WorkflowEntity> | Array<FindOptionsWhere<WorkflowEntity>>;

/**
 * Loads tags and shares for `workflows` with one query per relation (per batch of ids) and
 * assigns them, so each workflow row is read once. A workflow with no tags or shares gets an
 * empty list. Tags are ordered by creation, like the workflow list.
 *
 * Runs on `manager`, so it reads the caller's transaction.
 */
export async function loadWorkflowCollections(
	manager: EntityManager,
	workflows: WorkflowEntity[],
	collections: WorkflowCollections,
): Promise<void> {
	const ids = [...new Set(workflows.map(({ id }) => id))];
	if (ids.length === 0) return;

	if (collections.tags) {
		const tagsByWorkflow = new Map<string, TagEntity[]>();
		for (const chunk of chunkIds(ids)) {
			const mappings = (await manager
				.createQueryBuilder(WorkflowTagMapping, 'mapping')
				.innerJoinAndMapOne('mapping.tag', TagEntity, 'tag', 'tag.id = mapping.tagId')
				.where('mapping.workflowId IN (:...ids)', { ids: chunk })
				.orderBy('tag.createdAt', 'ASC')
				.addOrderBy('tag.id', 'ASC')
				.getMany()) as Array<WorkflowTagMapping & { tag: TagEntity }>;

			for (const { workflowId, tag } of mappings) {
				const tags = tagsByWorkflow.get(workflowId) ?? [];
				tags.push(tag);
				tagsByWorkflow.set(workflowId, tags);
			}
		}
		for (const workflow of workflows) workflow.tags = tagsByWorkflow.get(workflow.id) ?? [];
	}

	if (collections.shared) {
		const withProject = typeof collections.shared === 'object' && collections.shared.project;
		const sharesByWorkflow = new Map<string, SharedWorkflow[]>();
		for (const chunk of chunkIds(ids)) {
			const shares = await manager.find(SharedWorkflow, {
				where: { workflowId: In(chunk) },
				relations: { project: withProject },
				order: { createdAt: 'ASC', projectId: 'ASC' },
			});

			for (const share of shares) {
				const workflowShares = sharesByWorkflow.get(share.workflowId) ?? [];
				workflowShares.push(share);
				sharesByWorkflow.set(share.workflowId, workflowShares);
			}
		}
		for (const workflow of workflows) workflow.shared = sharesByWorkflow.get(workflow.id) ?? [];
	}
}

/**
 * Whether `workflow`, whose shares {@link loadWorkflowCollections} just loaded, was deleted
 * after it was read. A workflow always has an owner share, so no shares usually means the
 * delete landed between the two reads. Only then does it check the row: a workflow that still
 * exists without shares is broken data, and callers have always loaded it as it is.
 */
export async function wasDeletedAfterRead(
	manager: EntityManager,
	workflow: WorkflowEntity,
): Promise<boolean> {
	if (workflow.shared.length > 0) return false;
	return !(await manager.existsBy(WorkflowEntity, { id: workflow.id }));
}

/** `['shared', 'shared.project']` → `{ shared: { project: true } }`, as TypeORM reads them. */
function toRelationsObject(relations: string[] | WorkflowRelations): Record<string, unknown> {
	if (!Array.isArray(relations)) return { ...relations };

	const result: Record<string, unknown> = {};
	for (const path of relations) {
		let level = result;
		const parts = path.split('.');
		for (const [index, part] of parts.entries()) {
			if (index === parts.length - 1) {
				if (level[part] === undefined) level[part] = true;
				continue;
			}
			if (typeof level[part] !== 'object' || level[part] === null) level[part] = {};
			level = level[part] as Record<string, unknown>;
		}
	}
	return result;
}

/** `true`, or an object whose keys are all in `allowed` with boolean values. */
function isFlatRelation(
	value: unknown,
	allowed: string[],
): value is true | Record<string, boolean> {
	if (value === true) return true;
	if (typeof value !== 'object' || value === null) return false;
	return Object.entries(value).every(
		([key, nested]) => allowed.includes(key) && typeof nested === 'boolean',
	);
}

/**
 * Splits find-option relations for a workflow query into the ones safe to join and the
 * collections to load with {@link loadWorkflowCollections}.
 *
 * A collection stays joined when `where` filters on it, because TypeORM then returns only
 * the matching related rows, and loading it separately would return all of them. It also
 * stays joined when it asks for nested relations the loader does not cover.
 */
export function splitWorkflowRelations(
	relations: string[] | WorkflowRelations | undefined,
	where?: WorkflowWhere,
): { relations: WorkflowRelations | undefined; collections: WorkflowCollections } {
	if (relations === undefined) return { relations: undefined, collections: {} };

	const joined = toRelationsObject(relations);
	const filteredOn = new Set(
		(Array.isArray(where) ? where : where ? [where] : []).flatMap((condition) =>
			Object.keys(condition),
		),
	);
	const collections: WorkflowCollections = {};

	const { tags, shared } = joined;
	if (isFlatRelation(tags, []) && !filteredOn.has('tags')) {
		collections.tags = true;
		delete joined.tags;
	}

	if (isFlatRelation(shared, ['project']) && !filteredOn.has('shared')) {
		collections.shared = shared !== true && shared.project ? { project: true } : true;
		delete joined.shared;
	}

	return { relations: joined as WorkflowRelations, collections };
}
