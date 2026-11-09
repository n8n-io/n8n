import type { INodeParameters } from 'n8n-workflow';

import { createNode } from '../../../__tests__/test-helpers';
import { itemListsToTransformNodes } from '../item-lists.migration';

// Item Lists 1 and 2 store field lists as a collection: `{ fields: [{ fieldName }] }`.
const fields = (...names: string[]) => ({ fields: names.map((fieldName) => ({ fieldName })) });

const migrate = (typeVersion: number, parameters: INodeParameters) =>
	itemListsToTransformNodes.migrate({
		...createNode('Item Lists', 'n8n-nodes-base.itemLists', {
			resource: 'itemList',
			...parameters,
		}),
		typeVersion,
	});

const LEGACY_VERSIONS = [1, 2, 2.1, 2.2];

describe('Item Lists 1 and 2', () => {
	describe('operation names', () => {
		it.each(LEGACY_VERSIONS)('does not know "concatenateItems" in Item Lists %s', (version) => {
			expect(() => migrate(version, { operation: 'concatenateItems' })).toThrow('not supported');
		});

		it('does not know "aggregateItems" in Item Lists 3', () => {
			expect(() => migrate(3, { operation: 'aggregateItems' })).toThrow('not supported');
		});
	});

	// The old nodes stop with an error where the new nodes continue. A note tells the user to
	// check the workflow, and it turns off the one-click republish.
	describe('note about a failure that becomes a success', () => {
		const aggregate = (parameters: INodeParameters = {}, options: INodeParameters = {}) => ({
			operation: 'aggregateItems',
			aggregate: 'aggregateIndividualFields',
			fieldsToAggregate: { fieldToAggregate: [{ fieldToAggregate: 'id' }] },
			...parameters,
			...(Object.keys(options).length > 0 ? { options } : {}),
		});

		describe('Aggregate with individual fields', () => {
			it.each([1, 2])(
				'reports a note in Item Lists %s when a missing field stops the node',
				(v) => {
					expect(migrate(v, aggregate()).notes).toEqual([
						expect.stringContaining('missing in all items'),
					]);
				},
			);

			it('reports a note when the saved node omits the mode and the field', () => {
				expect(migrate(2, { operation: 'aggregateItems' }).notes).toHaveLength(1);
			});

			it.each([2.1, 2.2])('reports no note in Item Lists %s, because it never stops', (v) => {
				expect(migrate(v, aggregate()).notes).toBeUndefined();
			});

			it.each([1, 2])('reports no note in Item Lists %s when Keep Missing is on', (v) => {
				expect(migrate(v, aggregate({}, { keepMissing: true })).notes).toBeUndefined();
			});

			it.each([
				['off', false],
				['an expression, which could be off', '={{ $json.keep }}'],
			])('reports a note when Keep Missing is %s', (_name, keepMissing) => {
				expect(migrate(1, aggregate({}, { keepMissing })).notes).toHaveLength(1);
			});
		});

		describe('Split Out', () => {
			const splitOut = { operation: 'splitOutItems', fieldToSplitOut: 'tags' };

			it.each([1, 2])(
				'reports a note in Item Lists %s for a missing field or a plain value',
				(v) => {
					expect(migrate(v, splitOut).notes).toEqual([expect.stringContaining('was missing')]);
				},
			);

			it('reports a note in Item Lists 2.1 for a plain value only', () => {
				const { notes } = migrate(2.1, splitOut);

				expect(notes).toEqual([expect.stringContaining('not a list or an object')]);
				expect(notes?.[0]).not.toContain('was missing');
			});

			it('reports no note in Item Lists 2.2, because it never stops', () => {
				expect(migrate(2.2, splitOut).notes).toBeUndefined();
			});
		});

		it.each(LEGACY_VERSIONS)(
			'reports no note for Aggregate with all item data in %s',
			(version) => {
				const result = migrate(version, {
					operation: 'aggregateItems',
					aggregate: 'aggregateAllItemData',
				});

				expect(result.notes).toBeUndefined();
			},
		);

		it.each([
			['limit', { operation: 'limit', maxItems: 2 }],
			['sort', { operation: 'sort', type: 'simple' }],
			['removeDuplicates', { operation: 'removeDuplicates' }],
			['summarize', { operation: 'summarize' }],
		])('reports no note for %s', (_name, parameters) => {
			expect(migrate(2.2, parameters).notes).toBeUndefined();
		});

		it.each([
			['concatenateItems', { operation: 'concatenateItems' }],
			['splitOutItems', { operation: 'splitOutItems', fieldToSplitOut: 'tags' }],
		])(
			'reports no note for %s in Item Lists 3, because it is the template',
			(_name, parameters) => {
				expect(migrate(3, parameters).notes).toBeUndefined();
			},
		);
	});

	describe('Concatenate Items (aggregateItems) to Aggregate', () => {
		it.each(LEGACY_VERSIONS)('migrates a sparse node in Item Lists %s', (version) => {
			const { node } = migrate(version, { operation: 'aggregateItems' });

			expect(node).toEqual({ type: 'n8n-nodes-base.aggregate', typeVersion: 1, parameters: {} });
		});

		it('copies individual fields and the known options, and drops the rest', () => {
			const fieldsToAggregate = {
				fieldToAggregate: [{ fieldToAggregate: 'id', renameField: true, outputFieldName: 'ids' }],
			};

			const { node } = migrate(1, {
				operation: 'aggregateItems',
				aggregate: 'aggregateIndividualFields',
				fieldsToAggregate,
				options: { disableDotNotation: true, mergeLists: true, keepMissing: true, stale: 1 },
				// Hidden in this mode.
				destinationFieldName: 'stale',
				include: 'specifiedFields',
				fieldsToInclude: fields('stale'),
			});

			expect(node.parameters).toEqual({
				aggregate: 'aggregateIndividualFields',
				fieldsToAggregate,
				options: { disableDotNotation: true, mergeLists: true, keepMissing: true },
			});
		});

		it('keeps an expression in a field name of individual mode', () => {
			const fieldsToAggregate = { fieldToAggregate: [{ fieldToAggregate: '={{ $json.k }}' }] };

			const { node } = migrate(2.2, { operation: 'aggregateItems', fieldsToAggregate });

			expect(node.parameters).toEqual({ fieldsToAggregate });
		});

		it('converts the excluded fields of all item data to a string', () => {
			const { node } = migrate(2.1, {
				operation: 'aggregateItems',
				aggregate: 'aggregateAllItemData',
				include: 'allFieldsExcept',
				destinationFieldName: 'rows',
				fieldsToExclude: fields('a', 'b'),
			});

			expect(node.parameters).toEqual({
				aggregate: 'aggregateAllItemData',
				include: 'allFieldsExcept',
				destinationFieldName: 'rows',
				fieldsToExclude: 'a, b',
			});
		});

		it('converts the included fields and drops the list of the other mode', () => {
			const { node } = migrate(1, {
				operation: 'aggregateItems',
				aggregate: 'aggregateAllItemData',
				include: 'specifiedFields',
				fieldsToInclude: fields('x'),
				fieldsToExclude: fields('stale'),
				options: { mergeLists: true },
			});

			expect(node.parameters).toEqual({
				aggregate: 'aggregateAllItemData',
				include: 'specifiedFields',
				fieldsToInclude: 'x',
			});
		});

		it('writes no list for a sparse all-data node or an empty list', () => {
			const sparse = migrate(2, { operation: 'aggregateItems', aggregate: 'aggregateAllItemData' });

			expect(sparse.node.parameters).toEqual({ aggregate: 'aggregateAllItemData' });

			const { node } = migrate(2, {
				operation: 'aggregateItems',
				aggregate: 'aggregateAllItemData',
				include: 'specifiedFields',
				fieldsToInclude: { fields: [] },
			});

			expect(node.parameters).toEqual({
				aggregate: 'aggregateAllItemData',
				include: 'specifiedFields',
			});
		});

		it.each([
			['an empty field name', { fields: [{}] }],
			['a blank field name', fields('')],
			['a name with a space at the start', fields(' a')],
			['a name with a comma', fields('a,b')],
			['a name that is an expression', fields('={{ $json.k }}')],
			['a list that is not readable', { fields: 'a' }],
		])('refuses a list with %s', (_name, fieldsToInclude) => {
			const run = () =>
				migrate(2.2, {
					operation: 'aggregateItems',
					aggregate: 'aggregateAllItemData',
					include: 'specifiedFields',
					fieldsToInclude,
				});

			expect(run).toThrow('Fields to Include');
		});

		it.each([
			['an expression for the mode', { aggregate: '={{ $json.m }}' }],
			['an unknown mode', { aggregate: 'merge' }],
			[
				'an expression for the fields to include',
				{ aggregate: 'aggregateAllItemData', include: '={{ $json.i }}' },
			],
		])('refuses %s', (_name, parameters) => {
			expect(() => migrate(2, { operation: 'aggregateItems', ...parameters })).toThrow();
		});
	});

	describe('Remove Duplicates', () => {
		it.each(LEGACY_VERSIONS)('migrates a sparse node in Item Lists %s', (version) => {
			const { node } = migrate(version, { operation: 'removeDuplicates' });

			expect(node).toEqual({
				type: 'n8n-nodes-base.removeDuplicates',
				typeVersion: 1,
				parameters: {},
			});
		});

		it('trims the compared fields, as the old node does, and drops empty names', () => {
			const { node } = migrate(2.2, {
				operation: 'removeDuplicates',
				compare: 'selectedFields',
				fieldsToCompare: fields('a', ' b.c ', ''),
			});

			expect(node.parameters).toEqual({ compare: 'selectedFields', fieldsToCompare: 'a, b.c' });
		});

		it('converts the excluded fields and copies the options', () => {
			const { node } = migrate(1, {
				operation: 'removeDuplicates',
				compare: 'allFieldsExcept',
				fieldsToExclude: fields('id', 'createdAt'),
				options: { disableDotNotation: true, removeOtherFields: true },
			});

			expect(node.parameters).toEqual({
				compare: 'allFieldsExcept',
				fieldsToExclude: 'id, createdAt',
				options: { disableDotNotation: true, removeOtherFields: true },
			});
		});

		it('drops a stale list and stale options when all fields are compared', () => {
			const { node } = migrate(2, {
				operation: 'removeDuplicates',
				compare: 'allFields',
				fieldsToCompare: fields('={{ $json.k }}'),
				options: { removeOtherFields: '={{ true }}' },
			});

			expect(node.parameters).toEqual({ compare: 'allFields' });
		});

		it.each([
			['a name that is an expression', 'selectedFields', fields('={{ $json.k }}')],
			['a name with a comma', 'selectedFields', fields('a,b')],
			['a name without a field name', 'selectedFields', { fields: [{}] }],
			['an excluded name with a space at the start', 'allFieldsExcept', fields(' id')],
			['an excluded name that is only spaces', 'allFieldsExcept', fields('  ')],
			['an excluded name without a field name', 'allFieldsExcept', { fields: [{}] }],
		])('refuses %s', (_name, compare, list) => {
			const run = () =>
				migrate(2.1, {
					operation: 'removeDuplicates',
					compare,
					...(compare === 'selectedFields' ? { fieldsToCompare: list } : { fieldsToExclude: list }),
				});

			expect(run).toThrow();
		});

		it.each([
			['an expression for the mode', { compare: '={{ $json.m }}' }],
			['an unknown mode', { compare: 'some' }],
			[
				'an option that is an expression',
				{ compare: 'selectedFields', options: { removeOtherFields: '={{ true }}' } },
			],
		])('refuses %s', (_name, parameters) => {
			expect(() => migrate(2, { operation: 'removeDuplicates', ...parameters })).toThrow();
		});
	});

	describe('Split Out Items', () => {
		it('migrates a list of fields with destination fields in Item Lists 2.2', () => {
			const { node } = migrate(2.2, {
				operation: 'splitOutItems',
				fieldToSplitOut: 'a, b',
				options: { destinationFieldName: 'x,y' },
			});

			expect(node).toEqual({
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				parameters: { fieldToSplitOut: 'a, b', options: { destinationFieldName: 'x,y' } },
			});
		});

		it('converts the included fields to a string', () => {
			const { node } = migrate(2.1, {
				operation: 'splitOutItems',
				fieldToSplitOut: 'a',
				include: 'selectedOtherFields',
				fieldsToInclude: fields('id', 'user.name'),
			});

			expect(node.parameters).toEqual({
				fieldToSplitOut: 'a',
				include: 'selectedOtherFields',
				fieldsToInclude: 'id,user.name',
			});
		});

		it('drops options that belong to other operations', () => {
			const { node } = migrate(2.2, {
				operation: 'splitOutItems',
				fieldToSplitOut: 'a',
				options: {
					includeBinary: true,
					mergeLists: true,
					keepMissing: true,
					disableDotNotation: true,
				},
			});

			expect(node.parameters).toEqual({
				fieldToSplitOut: 'a',
				options: { disableDotNotation: true },
			});
		});

		it('accepts an expression in the field of Item Lists 2, which can only be checked at run time', () => {
			const { node } = migrate(2, {
				operation: 'splitOutItems',
				fieldToSplitOut: '={{ $json.field }}',
			});

			expect(node.parameters).toEqual({ fieldToSplitOut: '={{ $json.field }}' });
		});

		it.each([
			['no field', {}],
			['an empty entry', { fieldToSplitOut: 'a,,b' }],
			['a field that starts with $json.', { fieldToSplitOut: '$json.a' }],
			['a field that is $binary', { fieldToSplitOut: ' $binary ' }],
			[
				'an included field without a name',
				{ fieldToSplitOut: 'a', include: 'selectedOtherFields', fieldsToInclude: { fields: [{}] } },
			],
			[
				'an included field with a comma',
				{ fieldToSplitOut: 'a', include: 'selectedOtherFields', fieldsToInclude: fields('x,y') },
			],
			[
				'dot notation set by an expression',
				{ fieldToSplitOut: 'a', options: { disableDotNotation: '={{ true }}' } },
			],
			['an unknown include mode', { fieldToSplitOut: 'a', include: 'some' }],
		])('refuses Item Lists 2.2 with %s', (_name, parameters) => {
			expect(() => migrate(2.2, { operation: 'splitOutItems', ...parameters })).toThrow();
		});

		describe('Item Lists 1', () => {
			it('migrates one field with a destination field', () => {
				const { node } = migrate(1, {
					operation: 'splitOutItems',
					fieldToSplitOut: 'items',
					options: { destinationFieldName: 'item' },
				});

				expect(node.parameters).toEqual({
					fieldToSplitOut: 'items',
					options: { destinationFieldName: 'item' },
				});
			});

			it.each([
				['a list of fields', { fieldToSplitOut: 'a,b' }],
				['a field with a space at the start', { fieldToSplitOut: ' a' }],
				['a field that is an expression', { fieldToSplitOut: '={{ $json.f }}' }],
				[
					'a destination field with a comma',
					{ fieldToSplitOut: 'a', options: { destinationFieldName: 'x,y' } },
				],
				[
					'a destination field that is an expression',
					{ fieldToSplitOut: 'a', options: { destinationFieldName: '={{ $json.d }}' } },
				],
				[
					'an included field with the name of the split field',
					{ fieldToSplitOut: 'a', include: 'selectedOtherFields', fieldsToInclude: fields('a') },
				],
				[
					'an included field with the name of the destination field',
					{
						fieldToSplitOut: 'a',
						include: 'selectedOtherFields',
						fieldsToInclude: fields('d'),
						options: { destinationFieldName: 'd' },
					},
				],
				[
					'all other fields with a dot name and dot notation off',
					{
						fieldToSplitOut: 'a.b',
						include: 'allOtherFields',
						options: { disableDotNotation: true },
					},
				],
			])('refuses %s', (_name, parameters) => {
				expect(() => migrate(1, { operation: 'splitOutItems', ...parameters })).toThrow();
			});

			it('migrates all other fields with a dot name when dot notation is on', () => {
				const { node } = migrate(1, {
					operation: 'splitOutItems',
					fieldToSplitOut: 'a.b',
					include: 'allOtherFields',
				});

				expect(node.parameters).toEqual({ fieldToSplitOut: 'a.b', include: 'allOtherFields' });
			});
		});
	});

	describe('Summarize', () => {
		const values = (...entries: INodeParameters[]) => ({ fieldsToSummarize: { values: entries } });

		it('migrates a sparse count to Summarize 1.1 in Item Lists 2.2', () => {
			const { node } = migrate(2.2, { operation: 'summarize', ...values({ field: 'a' }) });

			expect(node).toEqual({
				type: 'n8n-nodes-base.summarize',
				typeVersion: 1.1,
				parameters: values({ field: 'a' }),
			});
		});

		it.each([
			[1, 1],
			[2, 1],
			[2.1, 1.1],
			[2.2, 1.1],
		])(
			'migrates Item Lists %s to Summarize %s, which treats a missing field in the same way',
			(version, expected) => {
				const { node } = migrate(version, {
					operation: 'summarize',
					...values({ aggregation: 'sum', field: 'amount' }),
				});

				expect(node.typeVersion).toBe(expected);
			},
		);

		it('copies the known options and drops the others', () => {
			const { node } = migrate(2, {
				operation: 'summarize',
				...values({ aggregation: 'sum', field: 'amount' }),
				options: {
					outputFormat: 'singleItem',
					disableDotNotation: true,
					skipEmptySplitFields: true,
					continueIfFieldNotFound: true,
				},
			});

			expect(node.parameters).toEqual({
				...values({ aggregation: 'sum', field: 'amount' }),
				options: {
					outputFormat: 'singleItem',
					disableDotNotation: true,
					skipEmptySplitFields: true,
				},
			});
		});

		it('keeps Include Empty and the separator for concatenate', () => {
			const entry = {
				aggregation: 'concatenate',
				field: 'a',
				includeEmpty: true,
				separateBy: 'other',
				customSeparator: '|',
			};

			const { node } = migrate(2.2, { operation: 'summarize', ...values(entry) });

			expect(node.parameters).toEqual(values(entry));
		});

		it('migrates a field with a dot in Item Lists 2, which cleans up the name as the new node does', () => {
			const { node } = migrate(2.2, { operation: 'summarize', ...values({ field: 'a.b' }) });

			expect(node.type).toBe('n8n-nodes-base.summarize');
		});

		it('migrates a field that is an expression in Item Lists 2', () => {
			const { node } = migrate(2, {
				operation: 'summarize',
				...values({ field: '={{ $json.f }}' }),
			});

			expect(node.type).toBe('n8n-nodes-base.summarize');
		});

		it.each([
			['a field with a dot', { field: 'a.b' }],
			['a field with a space', { field: 'a b' }],
			['a field with a bracket', { field: 'a[0]' }],
			['a field that is an expression', { field: '={{ $json.f }}' }],
		])('refuses %s in Item Lists 1, which keeps the output name as it is', (_name, entry) => {
			expect(() => migrate(1, { operation: 'summarize', ...values(entry) })).toThrow();
		});

		it.each([
			['Count with Include Empty', { aggregation: 'count', field: 'a', includeEmpty: true }],
			['a missing aggregation with Include Empty', { field: 'a', includeEmpty: true }],
			[
				'Count Unique with an expression',
				{ aggregation: 'countUnique', field: 'a', includeEmpty: '={{ true }}' },
			],
			['Minimum', { aggregation: 'min', field: 'price' }],
			['Maximum', { aggregation: 'max', field: 'price' }],
			['an aggregation that is an expression', { aggregation: '={{ $json.a }}', field: 'a' }],
			['an unknown aggregation', { aggregation: 'median', field: 'a' }],
		])('refuses %s', (_name, entry) => {
			expect(() => migrate(2.1, { operation: 'summarize', ...values(entry) })).toThrow();
		});

		it('refuses two fields that give the same output name after cleanup', () => {
			const run = () =>
				migrate(2.1, { operation: 'summarize', ...values({ field: 'a b' }, { field: 'a_b' }) });

			expect(run).toThrow('same output name');
		});

		it('migrates two entries with the same output name, which behave in the same way', () => {
			const { node } = migrate(2.1, {
				operation: 'summarize',
				...values({ field: 'a b' }, { field: 'a b' }),
			});

			expect(node.type).toBe('n8n-nodes-base.summarize');
		});

		it.each([['team'], ['={{ $json.k }}']])('refuses a split by "%s"', (fieldsToSplitBy) => {
			const run = () =>
				migrate(2.2, { operation: 'summarize', ...values({ field: 'a' }), fieldsToSplitBy });

			expect(run).toThrow('Fields to Split By');
		});
	});
});
