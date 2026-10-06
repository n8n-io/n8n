import { Set as SetNode } from 'n8n-nodes-base/dist/nodes/Set/Set.node';
import { RenameKeys } from 'n8n-nodes-base/dist/nodes/RenameKeys/RenameKeys.node';
import { DateTime } from 'n8n-nodes-base/dist/nodes/DateTime/DateTime.node';
import { Sort } from 'n8n-nodes-base/dist/nodes/Transform/Sort/Sort.node';
import { Limit } from 'n8n-nodes-base/dist/nodes/Transform/Limit/Limit.node';
import { RemoveDuplicates } from 'n8n-nodes-base/dist/nodes/Transform/RemoveDuplicates/RemoveDuplicates.node';
import { Aggregate } from 'n8n-nodes-base/dist/nodes/Transform/Aggregate/Aggregate.node';
import { SplitOut } from 'n8n-nodes-base/dist/nodes/Transform/SplitOut/SplitOut.node';
import { Summarize } from 'n8n-nodes-base/dist/nodes/Transform/Summarize/Summarize.node';
import { If } from 'n8n-nodes-base/dist/nodes/If/If.node';
import { Switch } from 'n8n-nodes-base/dist/nodes/Switch/Switch.node';
import { Filter } from 'n8n-nodes-base/dist/nodes/Filter/Filter.node';
import type { Action } from '@n8n/node-sdk';
import type { IDataObject, INodeParameters, INodeType, IVersionedNodeType } from 'n8n-workflow';

import { filterItems } from '../../nodes/condition/actions/filter';
import { ifCondition } from '../../nodes/condition/actions/if';
import { switchCases } from '../../nodes/condition/actions/switch';
import { aggregateItems } from '../../nodes/items/actions/aggregate';
import { dateTime } from '../../nodes/items/actions/date-time';
import { limitItems } from '../../nodes/items/actions/limit';
import { removeDuplicates } from '../../nodes/items/actions/remove-duplicates';
import { renameKeys } from '../../nodes/items/actions/rename-keys';
import { editFields } from '../../nodes/items/actions/set';
import { sortItems } from '../../nodes/items/actions/sort';
import { splitOut } from '../../nodes/items/actions/split-out';
import { summarizeItems } from '../../nodes/items/actions/summarize';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
} from './harness';

const people: IDataObject[] = [
	{ name: 'Ada', age: 36, team: 'core', tags: ['math', 'code'] },
	{ name: 'Linus', age: 17, team: 'kernel', tags: [] },
	{ name: 'ada', age: 36, team: 'core', tags: ['math'] },
	{ name: 'Grace', age: 85, team: 'navy', tags: ['code'] },
];

const legacy = (
	nodeType: INodeType | IVersionedNodeType,
	type: string,
	typeVersion: number,
	parameters: INodeParameters,
) => ({ nodeType, type: `n8n-nodes-base.${type}`, typeVersion, parameters });

async function expectParity(
	old: ReturnType<typeof legacy>,
	action: Action,
	parameters: Record<string, unknown>,
	parityCase: Partial<ParityCase> = {},
	allowed: readonly AllowedDifference[] = [],
) {
	const run: ParityCase = { input: people, routes: [], ...parityCase };
	const before = await runNode(old, run);
	const after = await runNode(actionNode(action, parameters), run);
	expect(before.error).toBeUndefined();
	expect([...before.items, ...before.otherOutputs.flat()].length).toBeGreaterThan(0);
	expect(compareRuns(before, after, allowed)).toEqual({ unexplained: [], stale: [] });
	return { before, after };
}

/** A legacy filter value with one condition, as the editor stores it. */
const legacyConditions = (
	conditions: ReadonlyArray<{
		left: string;
		type: string;
		operation: string;
		right?: string | number;
	}>,
	{ combinator = 'and', caseSensitive = true } = {},
) => ({
	options: { caseSensitive, leftValue: '', typeValidation: 'strict', version: 2 },
	conditions: conditions.map(({ left, type, operation, right }, index) => ({
		id: String(index),
		leftValue: left,
		rightValue: right ?? '',
		operator: { type, operation, ...(right === undefined ? { singleValue: true } : {}) },
	})),
	combinator,
});

describe('items.set parity with Edit Fields (Set) v3.4', () => {
	it('sets nested and computed fields and keeps the input fields', async () => {
		await expectParity(
			legacy(new SetNode(), 'set', 3.4, {
				mode: 'manual',
				assignments: {
					assignments: [
						{
							id: '1',
							name: 'profile.upper',
							value: '={{ $json.name.toUpperCase() }}',
							type: 'string',
						},
						{ id: '2', name: 'adult', value: '={{ $json.age >= 18 }}', type: 'boolean' },
					],
				},
				includeOtherFields: true,
				include: 'all',
				options: {},
			}),
			editFields,
			{
				fields: '={{ { "profile.upper": $json.name.toUpperCase(), adult: $json.age >= 18 } }}',
				include: { mode: 'all' },
			},
		);
	});

	it('keeps only the selected input fields', async () => {
		await expectParity(
			legacy(new SetNode(), 'set', 3.4, {
				mode: 'manual',
				assignments: { assignments: [{ id: '1', name: 'flag', value: true, type: 'boolean' }] },
				includeOtherFields: true,
				include: 'selected',
				includeFields: 'name,team',
				options: {},
			}),
			editFields,
			{ fields: { flag: true }, include: { mode: 'selected', fields: ['name', 'team'] } },
		);
	});
});

describe('items.renameKeys parity with Rename Keys v1', () => {
	it('renames top-level and nested keys from the input item', async () => {
		await expectParity(
			legacy(new RenameKeys(), 'renameKeys', 1, {
				keys: {
					key: [
						{ currentKey: 'name', newKey: 'person.name' },
						{ currentKey: 'tags', newKey: 'labels' },
					],
				},
			}),
			renameKeys,
			{
				keys: [
					{ from: 'name', to: 'person.name' },
					{ from: 'tags', to: 'labels' },
				],
			},
		);
	});
});

describe('items.dateTime parity with Date & Time v2', () => {
	const input = [{ when: '2026-01-31T10:30:00.000Z' }, { when: '2024-02-29T23:59:00.000Z' }];
	const utc = { input, timezone: 'UTC' };

	it('adds months and clamps the day of month', async () => {
		await expectParity(
			legacy(new DateTime(), 'dateTime', 2, {
				operation: 'addToDate',
				magnitude: '={{ $json.when }}',
				timeUnit: 'months',
				duration: 1,
				outputFieldName: 'newDate',
				options: { includeInputFields: true },
			}),
			dateTime,
			{
				date: '={{ $json.when }}',
				operation: { op: 'add', amount: 1, unit: 'months' },
				keepInput: true,
			},
			utc,
		);
	});

	it('rounds down to the week and reads the ISO week number', async () => {
		await expectParity(
			legacy(new DateTime(), 'dateTime', 2, {
				operation: 'roundDate',
				date: '={{ $json.when }}',
				mode: 'roundDown',
				toNearest: 'week',
				outputFieldName: 'newDate',
				options: {},
			}),
			dateTime,
			{ date: '={{ $json.when }}', operation: { op: 'round', direction: 'down', unit: 'week' } },
			utc,
		);
		await expectParity(
			legacy(new DateTime(), 'dateTime', 2, {
				operation: 'extractDate',
				date: '={{ $json.when }}',
				part: 'week',
				outputFieldName: 'week',
				options: {},
			}),
			dateTime,
			{
				date: '={{ $json.when }}',
				operation: { op: 'extract', part: 'week' },
				outputField: 'week',
			},
			utc,
		);
	});
});

describe('items.sort parity with Sort v1', () => {
	it('sorts by several fields, text without case, with the same tie order', async () => {
		await expectParity(
			legacy(new Sort(), 'sort', 1, {
				type: 'simple',
				sortFieldsUi: {
					sortField: [
						{ fieldName: 'age', order: 'descending' },
						{ fieldName: 'name', order: 'ascending' },
					],
				},
				options: {},
			}),
			sortItems,
			{ by: [{ field: 'age', order: 'descending' }, { field: 'name' }] },
		);
	});
});

describe('items.limit parity with Limit v1', () => {
	it('keeps the last items', async () => {
		await expectParity(
			legacy(new Limit(), 'limit', 1, { maxItems: 2, keep: 'lastItems' }),
			limitItems,
			{ maxItems: 2, keep: 'last' },
		);
	});
});

describe('items.removeDuplicates parity with Remove Duplicates v2', () => {
	it('keeps the first item of each set of equal selected fields', async () => {
		await expectParity(
			legacy(new RemoveDuplicates(), 'removeDuplicates', 2, {
				operation: 'removeDuplicateInputItems',
				compare: 'selectedFields',
				fieldsToCompare: 'age,team',
				options: {},
			}),
			removeDuplicates,
			{ compare: { mode: 'selected', fields: ['age', 'team'] } },
		);
	});

	const allFields = legacy(new RemoveDuplicates(), 'removeDuplicates', 2, {
		operation: 'removeDuplicateInputItems',
		compare: 'allFields',
		options: {},
	});

	it('compares all fields', async () => {
		const input = people.map(({ name, age, team }) => ({ name, age, team }));
		await expectParity(allFields, removeDuplicates, {}, { input: [...input, { ...input[0] }] });
	});

	it('compares items of different shapes, where the legacy node fails', async () => {
		const before = await runNode(allFields, { input: people, routes: [] });
		const after = await runNode(actionNode(removeDuplicates, {}), { input: people, routes: [] });
		expect(after.items).toHaveLength(4);
		expect(
			compareRuns(before, after, [
				{ path: 'error', kind: 'intended', reason: 'A missing field is a value, not an error.' },
				{ path: 'items', kind: 'intended', reason: 'The legacy node fails, so it has no items.' },
			]),
		).toEqual({ unexplained: [], stale: [] });
	});
});

describe('items.aggregate parity with Aggregate v1', () => {
	it('lists field values and merges lists', async () => {
		await expectParity(
			legacy(new Aggregate(), 'aggregate', 1, {
				aggregate: 'aggregateIndividualFields',
				fieldsToAggregate: {
					fieldToAggregate: [
						{ fieldToAggregate: 'name', renameField: false },
						{ fieldToAggregate: 'tags', renameField: true, outputFieldName: 'allTags' },
					],
				},
				options: { mergeLists: true },
			}),
			aggregateItems,
			{
				aggregate: {
					mode: 'fields',
					fields: [{ field: 'name' }, { field: 'tags', as: 'allTags' }],
					mergeLists: true,
				},
			},
		);
	});

	it('lists all items', async () => {
		await expectParity(
			legacy(new Aggregate(), 'aggregate', 1, {
				aggregate: 'aggregateAllItemData',
				destinationFieldName: 'people',
				options: {},
			}),
			aggregateItems,
			{ aggregate: { mode: 'items', into: 'people' } },
		);
	});
});

describe('items.splitOut parity with Split Out v1.1', () => {
	it('splits a list into a field and keeps the other fields', async () => {
		await expectParity(
			legacy(new SplitOut(), 'splitOut', 1.1, {
				fieldToSplitOut: 'tags',
				include: 'allOtherFields',
				options: { destinationFieldName: 'tag' },
			}),
			splitOut,
			{ field: 'tags', into: 'tag', include: { mode: 'all' } },
		);
	});

	it('spreads object entries into the item', async () => {
		const input = [
			{
				order: 1,
				lines: [
					{ sku: 'a', qty: 2 },
					{ sku: 'b', qty: 1 },
				],
			},
		];
		await expectParity(
			legacy(new SplitOut(), 'splitOut', 1.1, {
				fieldToSplitOut: 'lines',
				include: 'noOtherFields',
				options: {},
			}),
			splitOut,
			{ field: 'lines' },
			{ input },
		);
	});
});

describe('items.summarize parity with Summarize v1.1', () => {
	const fieldsToSummarize = {
		values: [
			{ aggregation: 'count', field: 'name' },
			{ aggregation: 'sum', field: 'age' },
			{ aggregation: 'concatenate', field: 'name', separateBy: ', ' },
			{ aggregation: 'max', field: 'age' },
		],
	};
	const fields = [
		{ aggregation: 'count', field: 'name' },
		{ aggregation: 'sum', field: 'age' },
		{ aggregation: 'concatenate', field: 'name', separator: ', ' },
		{ aggregation: 'max', field: 'age' },
	];

	it('summarizes by group into separate items', async () => {
		await expectParity(
			legacy(new Summarize(), 'summarize', 1.1, {
				fieldsToSummarize,
				fieldsToSplitBy: 'team',
				options: {},
			}),
			summarizeItems,
			{ fields, groupBy: ['team'] },
		);
	});

	it('summarizes by group into one item', async () => {
		await expectParity(
			legacy(new Summarize(), 'summarize', 1.1, {
				fieldsToSummarize,
				fieldsToSplitBy: 'team',
				options: { outputFormat: 'singleItem' },
			}),
			summarizeItems,
			{ fields, groupBy: ['team'], output: 'singleItem' },
		);
	});
});

const adultWhere =
	'={{ { match: "all", conditions: [{ type: "number", left: $json.age, test: { op: "gte", right: 18 } }] } }}';

describe('condition.if parity with If v2.2', () => {
	it('routes items to true and false', async () => {
		await expectParity(
			legacy(new If(), 'if', 2.2, {
				conditions: legacyConditions([
					{ left: '={{ $json.age }}', type: 'number', operation: 'gte', right: 18 },
				]),
				options: {},
			}),
			ifCondition,
			{ where: adultWhere },
		);
	});

	it('matches any of text conditions without case', async () => {
		await expectParity(
			legacy(new If(), 'if', 2.2, {
				conditions: legacyConditions(
					[
						{ left: '={{ $json.name }}', type: 'string', operation: 'equals', right: 'ADA' },
						{ left: '={{ $json.name }}', type: 'string', operation: 'regex', right: '/^gr/i' },
						{ left: '={{ $json.tags }}', type: 'array', operation: 'empty' },
					],
					{ combinator: 'or', caseSensitive: false },
				),
				options: { ignoreCase: true },
			}),
			ifCondition,
			{
				where:
					'={{ { match: "any", ignoreCase: true, conditions: [{ type: "string", left: $json.name, test: { op: "equals", right: "ADA" } }, { type: "string", left: $json.name, test: { op: "regex", right: "/^gr/i" } }, { type: "array", left: $json.tags, test: { op: "empty" } }] } }}',
			},
		);
	});
});

describe('condition.if parity in the form the flow SDK saves', () => {
	it('resolves nested expressions in an object parameter for each item', async () => {
		const { nodeType, type, typeVersion } = actionNode(ifCondition, {});
		// `branch({ if: (item) => item.age >= 18 })` saves this object, not JSON text.
		const parameters = {
			where: {
				conditions: [{ type: 'boolean', left: '={{ $json.age >= 18 }}', test: { op: 'true' } }],
			},
		};
		const old = legacy(new If(), 'if', 2.2, {
			conditions: legacyConditions([
				{ left: '={{ $json.age }}', type: 'number', operation: 'gte', right: 18 },
			]),
			options: {},
		});
		const run: ParityCase = { input: people, routes: [] };
		const before = await runNode(old, run);
		const after = await runNode({ nodeType, type, typeVersion, parameters }, run);
		expect(after.otherOutputs[0]).toHaveLength(1);
		expect(compareRuns(before, after, [])).toEqual({ unexplained: [], stale: [] });
	});
});

describe('condition.filter parity with Filter v2.2', () => {
	it('keeps matching items and discards the others', async () => {
		await expectParity(
			legacy(new Filter(), 'filter', 2.2, {
				conditions: legacyConditions([
					{ left: '={{ $json.age }}', type: 'number', operation: 'gte', right: 18 },
				]),
				options: {},
			}),
			filterItems,
			{ where: adultWhere },
		);
	});
});

describe('condition.switch parity with Switch v3.2', () => {
	const rule = (outputKey: string, operation: string, right: number) => ({
		outputKey,
		renameOutput: true,
		conditions: legacyConditions([{ left: '={{ $json.age }}', type: 'number', operation, right }]),
	});
	const contractCase = (output: string, op: string, right: number) => ({
		output,
		where: { conditions: [{ type: 'number', left: '={{ $json.age }}', test: { op, right } }] },
	});

	it('routes to the first matching case, else to fallback', async () => {
		await expectParity(
			legacy(new Switch(), 'switch', 3.2, {
				mode: 'rules',
				rules: { values: [rule('young', 'lt', 18), rule('senior', 'gte', 65)] },
				options: { fallbackOutput: 'extra' },
			}),
			switchCases,
			{
				cases: [contractCase('young', 'lt', 18), contractCase('senior', 'gte', 65)],
			},
		);
	});

	it('routes to every matching case', async () => {
		await expectParity(
			legacy(new Switch(), 'switch', 3.2, {
				mode: 'rules',
				rules: { values: [rule('adult', 'gte', 18), rule('senior', 'gte', 65)] },
				options: { fallbackOutput: 'extra', allMatchingOutputs: true },
			}),
			switchCases,
			{
				cases: [contractCase('adult', 'gte', 18), contractCase('senior', 'gte', 65)],
				allMatches: true,
			},
		);
	});
});
