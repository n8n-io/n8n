import type {
	EntityMetadata,
	EntityTarget,
	FindOptionsRelations,
	FindOptionsWhere,
	ObjectLiteral,
	SelectQueryBuilder,
} from '@n8n/typeorm';
import { DriverUtils } from '@n8n/typeorm/driver/DriverUtils';
import { OrmUtils } from '@n8n/typeorm/util/OrmUtils';

import { Project } from '../entities/project';
import { SharedWorkflow } from '../entities/shared-workflow';
import { TagEntity } from '../entities/tag-entity';
import type { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowTagMapping } from '../entities/workflow-tag-mapping';

/**
 * The workflow relations that hold several rows per workflow. Joining one of them onto a
 * workflow row repeats every workflow column, including the `nodes` and `connections` JSON
 * and a joined `activeVersion`, once per related row, and once per tag and share combination
 * when both are joined. {@link getWithWorkflowCollections} returns them as JSON arrays in the
 * same statement instead.
 */
export type WorkflowCollections = {
	tags?: boolean;
	/** `{ project: true }` also loads each share's project. */
	shared?: boolean | { project: boolean };
	/** Keeps only this project's share, as a join filtered on the project did. */
	sharedProjectId?: string;
};

type WorkflowRelations = FindOptionsRelations<WorkflowEntity>;

/** The alias the workflow must have in a query passed to {@link getWithWorkflowCollections}. */
const WORKFLOW_ALIAS = 'workflow';

/** Raw column names the aggregated collections come back under. */
const TAGS_COLUMN = 'workflow_collection_tags';
const SHARED_COLUMN = 'workflow_collection_shared';

type AnyQueryBuilder = SelectQueryBuilder<ObjectLiteral>;

const isPostgres = (qb: AnyQueryBuilder) => qb.connection.driver.options.type === 'postgres';

/** `"alias"."column"`, quoted for the current dialect. */
const quoted = (qb: AnyQueryBuilder, alias: string, column: string) =>
	`${qb.escape(alias)}.${qb.escape(column)}`;

/**
 * A JSON object holding every column of `target` read from `alias`, keyed by column name,
 * plus `nested` objects. Values keep the form the driver returns for the column, so
 * {@link hydrate} can convert them the way a normal read does.
 */
function jsonObject(
	qb: AnyQueryBuilder,
	target: EntityTarget<ObjectLiteral>,
	alias: string,
	nested: Record<string, string> = {},
) {
	const entries: Array<[string, string]> = [
		...qb.connection
			.getMetadata(target)
			.columns.map((column): [string, string] => [
				column.databaseName,
				quoted(qb, alias, column.databaseName),
			]),
		...Object.entries(nested),
	];
	const args = entries.flatMap(([key, value]) => [`'${key}'`, value]).join(', ');
	return isPostgres(qb) ? `json_build_object(${args})` : `json_object(${args})`;
}

/** A JSON array of `element` over the subquery rows, in `orderBy` order. Empty, not null. */
function jsonArray(qb: AnyQueryBuilder, element: string, orderBy: string) {
	return isPostgres(qb)
		? `COALESCE(json_agg(${element} ORDER BY ${orderBy}), '[]'::json)`
		: `json_group_array(${element} ORDER BY ${orderBy})`;
}

/**
 * Adds each requested collection of the workflow to `qb` as a JSON array built by a correlated
 * subquery. Tags are ordered by creation, like the workflow list, and shares by creation, then
 * project.
 */
function selectWorkflowCollections(qb: AnyQueryBuilder, collections: WorkflowCollections) {
	const workflowId = quoted(qb, WORKFLOW_ALIAS, 'id');

	if (collections.tags) {
		const tags = qb
			.subQuery()
			.select(
				jsonArray(
					qb,
					jsonObject(qb, TagEntity, 'wc_tag'),
					`${quoted(qb, 'wc_tag', 'createdAt')}, ${quoted(qb, 'wc_tag', 'id')}`,
				),
			)
			.from(WorkflowTagMapping, 'wc_mapping')
			.innerJoin(
				TagEntity,
				'wc_tag',
				`${quoted(qb, 'wc_tag', 'id')} = ${quoted(qb, 'wc_mapping', 'tagId')}`,
			)
			.where(`${quoted(qb, 'wc_mapping', 'workflowId')} = ${workflowId}`);
		qb.addSelect(tags.getQuery(), TAGS_COLUMN);
	}

	if (collections.shared) {
		const withProject = typeof collections.shared === 'object' && collections.shared.project;
		const nested: Record<string, string> = withProject
			? { project: jsonObject(qb, Project, 'wc_project') }
			: {};
		const shares = qb
			.subQuery()
			.select(
				jsonArray(
					qb,
					jsonObject(qb, SharedWorkflow, 'wc_share', nested),
					`${quoted(qb, 'wc_share', 'createdAt')}, ${quoted(qb, 'wc_share', 'projectId')}`,
				),
			)
			.from(SharedWorkflow, 'wc_share')
			.where(`${quoted(qb, 'wc_share', 'workflowId')} = ${workflowId}`);
		if (withProject) {
			shares.innerJoin(
				Project,
				'wc_project',
				`${quoted(qb, 'wc_project', 'id')} = ${quoted(qb, 'wc_share', 'projectId')}`,
			);
		}
		if (collections.sharedProjectId !== undefined) {
			shares.andWhere(`${quoted(qb, 'wc_share', 'projectId')} = :wcSharedProjectId`);
			qb.setParameter('wcSharedProjectId', collections.sharedProjectId);
		}
		qb.addSelect(shares.getQuery(), SHARED_COLUMN);
	}
}

const parseJson = (value: unknown): unknown =>
	typeof value === 'string' ? JSON.parse(value) : value;

/**
 * Postgres returns the aggregate as parsed JSON. SQLite returns it as text, and its aggregate
 * `ORDER BY` drops the JSON subtype, so each element is itself JSON text.
 */
export const parseJsonArray = (value: unknown): Array<Record<string, unknown>> => {
	const parsed = parseJson(value);
	return Array.isArray(parsed)
		? parsed.map((element) => parseJson(element) as Record<string, unknown>)
		: [];
};

/** Builds an entity from a JSON object of its columns, converting each value as a read would. */
function hydrate<Entity extends ObjectLiteral>(
	qb: AnyQueryBuilder,
	target: EntityTarget<Entity>,
	values: Record<string, unknown>,
): Entity {
	const metadata = qb.connection.getMetadata(target);
	const entity = metadata.create() as Entity;
	for (const column of metadata.columns) {
		if (!(column.databaseName in values)) continue;
		column.setEntityValue(
			entity,
			qb.connection.driver.prepareHydratedValue(values[column.databaseName], column),
		);
	}
	return entity;
}

/** Assigns the collections read by `qb` to each workflow. No tags or shares gives an empty list. */
function readWorkflowCollections(
	qb: AnyQueryBuilder,
	raw: Array<Record<string, unknown>>,
	workflows: WorkflowEntity[],
	collections: WorkflowCollections,
) {
	const idColumn = DriverUtils.buildAlias(qb.connection.driver, undefined, WORKFLOW_ALIAS, 'id');
	const rowsById = new Map(raw.map((row) => [String(row[idColumn]), row]));

	for (const workflow of workflows) {
		const row = rowsById.get(workflow.id);
		if (collections.tags) {
			workflow.tags = parseJsonArray(row?.[TAGS_COLUMN]).map((values) =>
				hydrate(qb, TagEntity, values),
			);
		}
		if (collections.shared) {
			workflow.shared = parseJsonArray(row?.[SHARED_COLUMN]).map((values) => {
				const share = hydrate(qb, SharedWorkflow, values);
				if (values.project) {
					share.project = hydrate(qb, Project, values.project as Record<string, unknown>);
				}
				return share;
			});
		}
	}
}

/**
 * Runs `qb`, whose workflow is aliased `workflow`, with the requested collections of that
 * workflow, and assigns them. The workflow row comes back once, in the same statement as its
 * tags and shares, so the result is one consistent read of the database and covers any access
 * check in `qb`. `workflowOf` picks the workflow when the query starts from another table.
 */
export async function getWithWorkflowCollections<Entity extends ObjectLiteral>(
	qb: SelectQueryBuilder<Entity>,
	collections: WorkflowCollections,
	workflowOf: (entity: Entity) => WorkflowEntity = (entity) => entity as unknown as WorkflowEntity,
): Promise<Entity[]> {
	const builder = qb as unknown as AnyQueryBuilder;
	selectWorkflowCollections(builder, collections);
	const { entities, raw } = await qb.getRawAndEntities();
	readWorkflowCollections(builder, raw, entities.map(workflowOf), collections);
	return entities;
}

/**
 * Whether `relations` joins a relation with several rows per row of `metadata`. Without one, a
 * plain LIMIT returns whole entities, and TypeORM's extra DISTINCT query for `take` is not needed.
 */
export function joinsSeveralRows(
	metadata: EntityMetadata,
	relations: FindOptionsRelations<ObjectLiteral> | undefined,
): boolean {
	return Object.entries(relations ?? {}).some(([path, nested]) => {
		if (!nested) return false;
		const relation = metadata.findRelationWithPropertyPath(path);
		if (!relation) return false;
		if (relation.isOneToMany || relation.isManyToMany) return true;
		return (
			typeof nested === 'object' &&
			joinsSeveralRows(
				relation.inverseEntityMetadata,
				nested as FindOptionsRelations<ObjectLiteral>,
			)
		);
	});
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
 * collections to aggregate with {@link getWithWorkflowCollections}.
 *
 * A collection stays joined when `where` filters on it, because TypeORM then returns only
 * the matching related rows, and aggregating it would return all of them. It also stays
 * joined when it asks for nested relations the aggregate does not cover.
 */
export function splitWorkflowRelations(
	relations: string[] | WorkflowRelations | undefined,
	where?: FindOptionsWhere<WorkflowEntity>,
): { relations: WorkflowRelations | undefined; collections: WorkflowCollections } {
	if (relations === undefined) return { relations: undefined, collections: {} };

	const joined: Record<string, unknown> = Array.isArray(relations)
		? OrmUtils.propertyPathsToTruthyObject(relations)
		: { ...relations };
	const collections: WorkflowCollections = {};

	const { tags, shared } = joined;
	if (isFlatRelation(tags, []) && !(where && 'tags' in where)) {
		collections.tags = true;
		delete joined.tags;
	}

	if (isFlatRelation(shared, ['project']) && !(where && 'shared' in where)) {
		collections.shared = shared !== true && shared.project ? { project: true } : true;
		delete joined.shared;
	}

	return { relations: joined as WorkflowRelations, collections };
}
