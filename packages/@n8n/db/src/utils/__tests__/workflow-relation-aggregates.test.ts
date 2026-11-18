import type { EntityMetadata } from '@n8n/typeorm';

import {
	joinsSeveralRows,
	parseJsonArray,
	splitWorkflowRelations,
} from '../workflow-relation-aggregates';

describe('splitWorkflowRelations', () => {
	it('keeps undefined relations as they are', () => {
		expect(splitWorkflowRelations(undefined)).toEqual({ relations: undefined, aggregates: {} });
	});

	it.each([
		[['tags', 'activeVersion'], { activeVersion: true }, { tags: true }],
		[['shared'], {}, { shared: true }],
		[['shared', 'shared.project'], {}, { shared: { project: true } }],
		[['shared.project'], {}, { shared: { project: true } }],
		[[], {}, {}],
	])('splits the relation paths %j', (relations, joined, aggregates) => {
		expect(splitWorkflowRelations(relations)).toEqual({ relations: joined, aggregates });
	});

	it.each([
		[{ activeVersion: true, shared: true }, { activeVersion: true }, { shared: true }],
		[
			{ shared: { project: true }, parentFolder: true },
			{ parentFolder: true },
			{ shared: { project: true } },
		],
		[{ shared: { project: false } }, {}, { shared: true }],
		[{ tags: true, shared: true }, {}, { tags: true, shared: true }],
		[{ tags: false, activeVersion: true }, { tags: false, activeVersion: true }, {}],
	])('splits the relations object %j', (relations, joined, aggregates) => {
		expect(splitWorkflowRelations(relations)).toEqual({ relations: joined, aggregates });
	});

	it('keeps a relation joined when it asks for nested relations the aggregate does not cover', () => {
		const relations = {
			shared: { project: { projectRelations: true } },
			tags: { workflows: true },
		};

		expect(splitWorkflowRelations(relations)).toEqual({ relations, aggregates: {} });
	});

	it.each([
		[{ shared: { projectId: 'project-1' } }, 'shared'],
		[{ id: 'workflow-1', tags: { name: 'prod' } }, 'tags'],
	])('keeps a relation joined when where %j filters on it', (where, relation) => {
		const { relations, aggregates } = splitWorkflowRelations(
			{ tags: true, shared: true, activeVersion: true },
			where,
		);

		expect(relations).toHaveProperty(relation, true);
		expect(aggregates).not.toHaveProperty(relation);
	});

	it('does not change the relations it was given', () => {
		const relations = { tags: true, shared: { project: true } };

		splitWorkflowRelations(relations);

		expect(relations).toEqual({ tags: true, shared: { project: true } });
	});
});

describe('parseJsonArray', () => {
	const share = { workflowId: 'workflow-1', projectId: 'project-1' };

	it('reads an array the driver already parsed, as Postgres returns it', () => {
		expect(parseJsonArray([share])).toEqual([share]);
	});

	it('reads an array returned as text, as SQLite returns it', () => {
		expect(parseJsonArray(JSON.stringify([share]))).toEqual([share]);
	});

	it('reads elements returned as text, as SQLite returns them after an aggregate ORDER BY', () => {
		expect(parseJsonArray(JSON.stringify([JSON.stringify(share)]))).toEqual([share]);
	});

	it.each([null, undefined, '[]', []])('returns an empty list for %j', (value) => {
		expect(parseJsonArray(value)).toEqual([]);
	});
});

describe('joinsSeveralRows', () => {
	/** Metadata whose relations are named by kind: `one` has one row, `many` has several. */
	const metadata = {
		findRelationWithPropertyPath: (path: string) =>
			path === 'unknown'
				? undefined
				: {
						isOneToMany: path === 'many',
						isManyToMany: false,
						get inverseEntityMetadata() {
							return metadata;
						},
					},
	} as unknown as EntityMetadata;

	it.each([
		[undefined, false],
		[{}, false],
		[{ one: true }, false],
		[{ one: { one: true } }, false],
		[{ many: false, one: true }, false],
		[{ unknown: true }, false],
		[{ many: true }, true],
		[{ one: { many: true } }, true],
	])('reads %j as joining several rows: %s', (relations, expected) => {
		expect(joinsSeveralRows(metadata, relations)).toBe(expected);
	});
});
