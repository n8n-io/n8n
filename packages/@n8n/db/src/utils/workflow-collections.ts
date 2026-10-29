import type {
	DataSource,
	EntityTarget,
	FindOptionsRelations,
	FindOptionsWhere,
	ObjectLiteral,
	SelectQueryBuilder,
} from '@n8n/typeorm';
import { DriverUtils } from '@n8n/typeorm/driver/DriverUtils';

import { Project } from '../entities/project';
import { SharedWorkflow } from '../entities/shared-workflow';
import { TagEntity } from '../entities/tag-entity';
import type { WorkflowEntity } from '../entities/workflow-entity';
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
 * Adds the requested collections of the workflow at `workflowAlias` to `qb`, each as a JSON
 * array built by a correlated subquery. They come back in the same statement as the workflow
 * row, so the result is one consistent read of the database, and the row is not repeated per
 * tag or share as a join would repeat it. Read them with {@link readWorkflowCollections}
 * after `getRawAndEntities()`.
 *
 * Tags are ordered by creation, like the workflow list, and shares by creation, then project.
 * `sharedProjectId` keeps only that project's share, as a join filtered on the project did.
 */
export function selectWorkflowCollections<Entity extends ObjectLiteral>(
	qb: SelectQueryBuilder<Entity>,
	workflowAlias: string,
	collections: WorkflowCollections & { sharedProjectId?: string },
): SelectQueryBuilder<Entity> {
	const builder = qb as unknown as AnyQueryBuilder;
	const workflowId = quoted(builder, workflowAlias, 'id');

	if (collections.tags) {
		const tags = builder
			.subQuery()
			.select(
				jsonArray(
					builder,
					jsonObject(builder, TagEntity, 'wc_tag'),
					`${quoted(builder, 'wc_tag', 'createdAt')}, ${quoted(builder, 'wc_tag', 'id')}`,
				),
			)
			.from(WorkflowTagMapping, 'wc_mapping')
			.innerJoin(
				TagEntity,
				'wc_tag',
				`${quoted(builder, 'wc_tag', 'id')} = ${quoted(builder, 'wc_mapping', 'tagId')}`,
			)
			.where(`${quoted(builder, 'wc_mapping', 'workflowId')} = ${workflowId}`);
		qb.addSelect(tags.getQuery(), TAGS_COLUMN);
	}

	if (collections.shared) {
		const withProject = typeof collections.shared === 'object' && collections.shared.project;
		const nested: Record<string, string> = withProject
			? { project: jsonObject(builder, Project, 'wc_project') }
			: {};
		const shares = builder
			.subQuery()
			.select(
				jsonArray(
					builder,
					jsonObject(builder, SharedWorkflow, 'wc_share', nested),
					`${quoted(builder, 'wc_share', 'createdAt')}, ${quoted(builder, 'wc_share', 'projectId')}`,
				),
			)
			.from(SharedWorkflow, 'wc_share')
			.where(`${quoted(builder, 'wc_share', 'workflowId')} = ${workflowId}`);
		if (withProject) {
			shares.innerJoin(
				Project,
				'wc_project',
				`${quoted(builder, 'wc_project', 'id')} = ${quoted(builder, 'wc_share', 'projectId')}`,
			);
		}
		if (collections.sharedProjectId !== undefined) {
			shares.andWhere(`${quoted(builder, 'wc_share', 'projectId')} = :wcSharedProjectId`);
			qb.setParameter('wcSharedProjectId', collections.sharedProjectId);
		}
		qb.addSelect(shares.getQuery(), SHARED_COLUMN);
	}

	return qb;
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
	dataSource: DataSource,
	target: EntityTarget<Entity>,
	values: Record<string, unknown>,
): Entity {
	const metadata = dataSource.getMetadata(target);
	const entity = metadata.create() as Entity;
	for (const column of metadata.columns) {
		if (!(column.databaseName in values)) continue;
		column.setEntityValue(
			entity,
			dataSource.driver.prepareHydratedValue(values[column.databaseName], column),
		);
	}
	return entity;
}

/**
 * Assigns the collections {@link selectWorkflowCollections} added to each workflow, from the
 * raw rows of the same query. A workflow without tags or shares gets an empty list.
 */
export function readWorkflowCollections(
	dataSource: DataSource,
	raw: Array<Record<string, unknown>>,
	workflows: WorkflowEntity[],
	workflowAlias: string,
	collections: WorkflowCollections,
): void {
	const idColumn = DriverUtils.buildAlias(dataSource.driver, undefined, workflowAlias, 'id');
	const rowsById = new Map(raw.map((row) => [String(row[idColumn]), row]));

	for (const workflow of workflows) {
		const row = rowsById.get(workflow.id);
		if (collections.tags) {
			workflow.tags = parseJsonArray(row?.[TAGS_COLUMN]).map((values) =>
				hydrate(dataSource, TagEntity, values),
			);
		}
		if (collections.shared) {
			workflow.shared = parseJsonArray(row?.[SHARED_COLUMN]).map((values) => {
				const share = hydrate(dataSource, SharedWorkflow, values);
				if (values.project) {
					share.project = hydrate(dataSource, Project, values.project as Record<string, unknown>);
				}
				return share;
			});
		}
	}
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
 * collections to aggregate with {@link selectWorkflowCollections}.
 *
 * A collection stays joined when `where` filters on it, because TypeORM then returns only
 * the matching related rows, and aggregating it would return all of them. It also stays
 * joined when it asks for nested relations the aggregate does not cover.
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
