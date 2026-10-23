import type { INodeParameters } from 'n8n-workflow';

import { createNode } from '../../../__tests__/test-helpers';
import { itemListsToTransformNodes } from '../item-lists.migration';

const itemLists = (typeVersion: number, parameters: INodeParameters) => ({
	...createNode('Item Lists', 'n8n-nodes-base.itemLists', { resource: 'itemList', ...parameters }),
	typeVersion,
});

describe('itemListsToTransformNodes migration', () => {
	it('is keyed by the Item Lists rule id', () => {
		expect(itemListsToTransformNodes.ruleId).toBe('item-lists-removed-v3');
	});

	describe.each([1, 2, 2.1, 2.2, 3, 3.1])('Item Lists %s', (version) => {
		it('migrates Limit', () => {
			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, { operation: 'limit', maxItems: 5, keep: 'lastItems' }),
			);

			expect(node).toEqual({
				type: 'n8n-nodes-base.limit',
				typeVersion: 1,
				parameters: { maxItems: 5, keep: 'lastItems' },
			});
		});

		it('migrates Sort', () => {
			const sortFieldsUi = { sortField: [{ fieldName: 'name', order: 'descending' }] };

			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, {
					operation: 'sort',
					type: 'simple',
					sortFieldsUi,
					options: { disableDotNotation: true },
				}),
			);

			expect(node).toEqual({
				type: 'n8n-nodes-base.sort',
				typeVersion: 1,
				parameters: {
					type: 'simple',
					sortFieldsUi,
					options: { disableDotNotation: true },
				},
			});
		});
	});

	describe.each([3, 3.1])('Item Lists %s', (version) => {
		it('migrates Concatenate Items to Aggregate', () => {
			const fieldsToAggregate = {
				fieldToAggregate: [{ fieldToAggregate: 'id', renameField: true, outputFieldName: 'ids' }],
			};

			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, {
					operation: 'concatenateItems',
					aggregate: 'aggregateIndividualFields',
					fieldsToAggregate,
					options: { mergeLists: true },
				}),
			);

			expect(node).toEqual({
				type: 'n8n-nodes-base.aggregate',
				typeVersion: 1,
				parameters: {
					aggregate: 'aggregateIndividualFields',
					fieldsToAggregate,
					options: { mergeLists: true },
				},
			});
		});

		it('migrates Split Out Items to Split Out 1, which has no nested destination paths', () => {
			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, {
					operation: 'splitOutItems',
					fieldToSplitOut: 'items',
					include: 'selectedOtherFields',
					fieldsToInclude: 'a, b',
					options: { destinationFieldName: 'item' },
				}),
			);

			expect(node).toEqual({
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				parameters: {
					fieldToSplitOut: 'items',
					include: 'selectedOtherFields',
					fieldsToInclude: 'a, b',
					options: { destinationFieldName: 'item' },
				},
			});
		});

		it.each([[''], ['a,'], [' , b'], ['a,,b']])(
			'refuses Split Out Items with an empty entry in Field to Split Out (%j), which Split Out ignores',
			(fieldToSplitOut) => {
				const node = itemLists(version, { operation: 'splitOutItems', fieldToSplitOut });

				expect(() => itemListsToTransformNodes.migrate(node)).toThrow('empty');
			},
		);

		it('refuses Split Out Items when Field to Split Out is missing', () => {
			const node = itemLists(version, { operation: 'splitOutItems' });

			expect(() => itemListsToTransformNodes.migrate(node)).toThrow('empty');
		});

		it.each([['a, b'], ['={{ $json.fields }}']])(
			'migrates Split Out Items with Field to Split Out %j',
			(fieldToSplitOut) => {
				const node = itemLists(version, { operation: 'splitOutItems', fieldToSplitOut });

				expect(itemListsToTransformNodes.migrate(node).node.type).toBe('n8n-nodes-base.splitOut');
			},
		);

		it('treats a missing operation as Split Out Items, the Item Lists default', () => {
			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, { fieldToSplitOut: 'items' }),
			);

			expect(node.type).toBe('n8n-nodes-base.splitOut');
		});

		it('migrates Summarize to Summarize 1.1, which reports a missing field as a hint', () => {
			const parameters = {
				fieldsToSummarize: { values: [{ aggregation: 'sum', field: 'amount' }] },
				options: { outputFormat: 'singleItem' },
			};

			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, { operation: 'summarize', ...parameters }),
			);

			expect(node).toEqual({
				type: 'n8n-nodes-base.summarize',
				typeVersion: 1.1,
				parameters,
			});
		});

		it.each([['team'], ['team, region'], [' , team']])(
			'refuses Summarize that splits by "%s", because Summarize keeps the type and order of the values',
			(fieldsToSplitBy) => {
				const node = itemLists(version, {
					operation: 'summarize',
					fieldsToSummarize: { values: [{ aggregation: 'sum', field: 'amount' }] },
					fieldsToSplitBy,
				});

				expect(() => itemListsToTransformNodes.migrate(node)).toThrow('Fields to Split By');
			},
		);

		it.each([[undefined], [''], [' , ']])(
			'migrates Summarize with an empty Fields to Split By (%j)',
			(fieldsToSplitBy) => {
				const node = itemLists(version, {
					operation: 'summarize',
					fieldsToSummarize: { values: [{ aggregation: 'sum', field: 'amount' }] },
					...(fieldsToSplitBy === undefined ? {} : { fieldsToSplitBy }),
				});

				expect(itemListsToTransformNodes.migrate(node).node.type).toBe('n8n-nodes-base.summarize');
			},
		);

		it('refuses Summarize that splits by an expression', () => {
			const node = itemLists(version, {
				operation: 'summarize',
				fieldsToSummarize: { values: [{ aggregation: 'sum', field: 'amount' }] },
				fieldsToSplitBy: '={{ $json.field }}',
			});

			expect(() => itemListsToTransformNodes.migrate(node)).toThrow('Fields to Split By');
		});

		it.each([['count'], ['countUnique'], [undefined]])(
			'refuses Summarize with "Include Empty Values" on for %s',
			(aggregation) => {
				// A saved workflow omits the default aggregation, `count`.
				const node = itemLists(version, {
					operation: 'summarize',
					fieldsToSummarize: {
						values: [{ ...(aggregation ? { aggregation } : {}), field: 'x', includeEmpty: true }],
					},
				});

				expect(() => itemListsToTransformNodes.migrate(node)).toThrow('Include Empty');
			},
		);

		it('refuses "Include Empty Values" when an expression sets the aggregation', () => {
			const node = itemLists(version, {
				operation: 'summarize',
				fieldsToSummarize: {
					values: [{ aggregation: '={{ $json.how }}', field: 'x', includeEmpty: true }],
				},
			});

			expect(() => itemListsToTransformNodes.migrate(node)).toThrow('Include Empty');
		});

		it('keeps "Include Empty Values" for append, where both nodes use it', () => {
			const { node } = itemListsToTransformNodes.migrate(
				itemLists(version, {
					operation: 'summarize',
					fieldsToSummarize: {
						values: [{ aggregation: 'append', field: 'x', includeEmpty: true }],
					},
				}),
			);

			expect(node.parameters.fieldsToSummarize).toEqual({
				values: [{ aggregation: 'append', field: 'x', includeEmpty: true }],
			});
		});
	});

	it('migrates Remove Duplicates 3 to Remove Duplicates 1, which has a single output', () => {
		const { node } = itemListsToTransformNodes.migrate(
			itemLists(3, {
				operation: 'removeDuplicates',
				compare: 'selectedFields',
				fieldsToCompare: 'email',
				options: { removeOtherFields: true },
			}),
		);

		expect(node).toEqual({
			type: 'n8n-nodes-base.removeDuplicates',
			typeVersion: 1,
			parameters: {
				compare: 'selectedFields',
				fieldsToCompare: 'email',
				options: { removeOtherFields: true },
			},
		});
	});

	it('refuses Remove Duplicates 3.1, which accepts values of mixed types', () => {
		const node = itemLists(3.1, { operation: 'removeDuplicates' });

		expect(() => itemListsToTransformNodes.migrate(node)).toThrow('different types');
	});

	it.each([
		['an unknown operation', { operation: 'merge' }],
		['an operation set by an expression', { operation: '={{ $json.op }}' }],
		['an operation that names a prototype property', { operation: 'constructor' }],
	])('refuses %s', (_name, parameters) => {
		expect(() => itemListsToTransformNodes.migrate(itemLists(3, parameters))).toThrow();
	});

	it('leaves out parameters that belong to other operations', () => {
		const { node } = itemListsToTransformNodes.migrate(
			itemLists(3, { operation: 'limit', maxItems: 2, fieldToSplitOut: 'stale' }),
		);

		expect(node.parameters).toEqual({ maxItems: 2 });
	});
});
