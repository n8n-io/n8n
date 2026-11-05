import type { EntityMetadata } from '@n8n/typeorm';

import { joinsSeveralRows, parseJsonArray, splitWorkflowRelations } from '../workflow-collections';

describe('splitWorkflowRelations', () => {
	it('keeps undefined relations as they are', () => {
		expect(splitWorkflowRelations(undefined)).toEqual({ relations: undefined, collections: {} });
	});

	it.each([
		[['tags', 'activeVersion'], { activeVersion: true }, { tags: true }],
		[['shared'], {}, { shared: true }],
		[['shared', 'shared.project'], {}, { shared: { project: true } }],
		[['shared.project'], {}, { shared: { project: true } }],
		[[], {}, {}],
	])('splits the relation paths %j', (relations, joined, collections) => {
		expect(splitWorkflowRelations(relations)).toEqual({ relations: joined, collections });
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
	])('splits the relations object %j', (relations, joined, collections) => {
		expect(splitWorkflowRelations(relations)).toEqual({ relations: joined, collections });
	});

	it('keeps a collection joined when it asks for nested relations the loader does not cover', () => {
		const relations = {
			shared: { project: { projectRelations: true } },
			tags: { workflows: true },
		};

		expect(splitWorkflowRelations(relations)).toEqual({ relations, collections: {} });
	});

	it.each([
		[{ shared: { projectId: 'project-1' } }, 'shared'],
		[{ id: 'workflow-1', tags: { name: 'prod' } }, 'tags'],
	])('keeps a collection joined when where %j filters on it', (where, collection) => {
		const { relations, collections } = splitWorkflowRelations(
			{ tags: true, shared: true, activeVersion: true },
			where,
		);

		expect(relations).toHaveProperty(collection, true);
		expect(collections).not.toHaveProperty(collection);
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
