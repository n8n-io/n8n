import type { FilterValue, INode, INodeProperties, INodeType } from 'n8n-workflow';

import { omitHiddenFilterRightValues } from '../omit-hidden-filter-right-values';

const createNode = (parameters: INode['parameters']): INode => ({
	id: 'node-1',
	name: 'Test',
	type: 'n8n-nodes-base.test',
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const createNodeType = (properties: INodeProperties[]): INodeType => ({
	description: {
		name: 'testNode',
		displayName: 'Test Node',
		group: ['transform'],
		version: 1,
		description: 'Test',
		defaults: { name: 'Test' },
		inputs: [],
		outputs: [],
		properties,
	},
});

const createFilterValue = (rightValue: string, singleValue?: boolean): FilterValue => ({
	options: {
		caseSensitive: true,
		leftValue: '',
		typeValidation: 'strict',
		version: 3,
	},
	conditions: [
		{
			id: 'cond-1',
			leftValue: '={{ $json.value }}',
			rightValue,
			operator: {
				type: 'string',
				operation: singleValue ? 'exists' : 'equals',
				...(singleValue !== undefined ? { singleValue } : {}),
			},
		},
	],
	combinator: 'and',
});

describe('omitHiddenFilterRightValues', () => {
	it('omits rightValue on single-value conditions for a direct filter property without mutating input', () => {
		const conditions = createFilterValue("={{ $('Deleted').item.json.x }}", true);
		const node = createNode({ conditions });
		const nodeType = createNodeType([
			{
				displayName: 'Conditions',
				name: 'conditions',
				type: 'filter',
				default: {},
			},
		]);

		const result = omitHiddenFilterRightValues(conditions, 'conditions', node, nodeType);

		expect(result).toEqual({
			...conditions,
			conditions: [
				{
					id: 'cond-1',
					leftValue: '={{ $json.value }}',
					operator: {
						type: 'string',
						operation: 'exists',
						singleValue: true,
					},
				},
			],
		});
		expect(conditions.conditions[0].rightValue).toBe("={{ $('Deleted').item.json.x }}");
	});

	it.each([undefined, false])(
		'preserves rightValue on filter conditions when singleValue is %s',
		(singleValue) => {
			const conditions = createFilterValue("={{ $('Deleted').item.json.x }}", singleValue);
			const node = createNode({ conditions });
			const nodeType = createNodeType([
				{
					displayName: 'Conditions',
					name: 'conditions',
					type: 'filter',
					default: {},
				},
			]);

			const result = omitHiddenFilterRightValues(conditions, 'conditions', node, nodeType);

			expect(result).toBe(conditions);
			expect(conditions.conditions[0].rightValue).toBe("={{ $('Deleted').item.json.x }}");
		},
	);

	it('omits hidden rightValue for filters nested inside a fixedCollection (Switch rules)', () => {
		const singleValueFilter = createFilterValue("={{ $('Deleted').item.json.x }}", true);
		const twoValueFilter = createFilterValue('expected');
		const rules = {
			values: [
				{
					conditions: singleValueFilter,
					renameOutput: true,
					outputKey: 'Exists',
				},
				{
					conditions: twoValueFilter,
					renameOutput: true,
					outputKey: 'Equals',
				},
			],
		};
		const node = createNode({ mode: 'rules', rules });
		const nodeType = createNodeType([
			{
				displayName: 'Rules',
				name: 'rules',
				type: 'fixedCollection',
				default: {},
				displayOptions: { show: { mode: ['rules'] } },
				options: [
					{
						name: 'values',
						displayName: 'Routing Rule',
						values: [
							{
								displayName: 'Conditions',
								name: 'conditions',
								type: 'filter',
								default: {},
							},
							{
								displayName: 'Rename Output',
								name: 'renameOutput',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Output Name',
								name: 'outputKey',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		]);

		// Switch reads both `rules.values` and `rules.values[0].conditions`
		const strippedRulesValues = omitHiddenFilterRightValues(
			rules.values,
			'rules.values',
			node,
			nodeType,
		);
		expect(strippedRulesValues).toEqual([
			{
				conditions: {
					...singleValueFilter,
					conditions: [
						{
							id: 'cond-1',
							leftValue: '={{ $json.value }}',
							operator: {
								type: 'string',
								operation: 'exists',
								singleValue: true,
							},
						},
					],
				},
				renameOutput: true,
				outputKey: 'Exists',
			},
			rules.values[1],
		]);

		const strippedRuleItem = omitHiddenFilterRightValues(
			rules.values[0],
			'rules.values[0]',
			node,
			nodeType,
		);
		expect(strippedRuleItem).toEqual({
			conditions: {
				...singleValueFilter,
				conditions: [
					{
						id: 'cond-1',
						leftValue: '={{ $json.value }}',
						operator: {
							type: 'string',
							operation: 'exists',
							singleValue: true,
						},
					},
				],
			},
			renameOutput: true,
			outputKey: 'Exists',
		});

		const strippedRuleCondition = omitHiddenFilterRightValues(
			singleValueFilter,
			'rules.values[0].conditions',
			node,
			nodeType,
		);
		expect(strippedRuleCondition).toEqual({
			...singleValueFilter,
			conditions: [
				{
					id: 'cond-1',
					leftValue: '={{ $json.value }}',
					operator: {
						type: 'string',
						operation: 'exists',
						singleValue: true,
					},
				},
			],
		});

		const strippedRootRules = omitHiddenFilterRightValues(rules, 'rules', node, nodeType);
		expect(strippedRootRules).toEqual({
			values: strippedRulesValues,
		});

		// Original node parameters stay untouched
		expect(singleValueFilter.conditions[0].rightValue).toBe("={{ $('Deleted').item.json.x }}");
	});

	it('omits hidden rightValue for filters nested inside a collection', () => {
		const filter = createFilterValue("={{ $('Deleted').item.json.x }}", true);
		const options = { filter };
		const node = createNode({ options });
		const nodeType = createNodeType([
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'filter',
						default: {},
					},
				],
			},
		]);

		const result = omitHiddenFilterRightValues(options, 'options', node, nodeType);

		expect(result).toEqual({
			filter: {
				...filter,
				conditions: [
					{
						id: 'cond-1',
						leftValue: '={{ $json.value }}',
						operator: {
							type: 'string',
							operation: 'exists',
							singleValue: true,
						},
					},
				],
			},
		});
		expect(filter.conditions[0].rightValue).toBe("={{ $('Deleted').item.json.x }}");
	});

	it('preserves rightValue on unrelated object parameters that happen to share filter condition keys', () => {
		const unrelatedPayload = {
			leftValue: '={{ $json.left }}',
			rightValue: '={{ $json.right }}',
			operator: {
				type: 'string',
				operation: 'exists',
				singleValue: true,
			},
		};
		const node = createNode({
			conditions: createFilterValue('x', true),
			payload: unrelatedPayload,
		});
		const nodeType = createNodeType([
			{
				displayName: 'Conditions',
				name: 'conditions',
				type: 'filter',
				default: {},
			},
			{
				displayName: 'Payload',
				name: 'payload',
				type: 'json',
				default: '{}',
			},
		]);

		const result = omitHiddenFilterRightValues(unrelatedPayload, 'payload', node, nodeType);

		expect(result).toBe(unrelatedPayload);
		expect(result).toEqual(unrelatedPayload);
	});

	it('returns primitive values and nodes without filter properties unchanged', () => {
		const payload = {
			leftValue: 'a',
			rightValue: 'b',
			operator: { type: 'string', operation: 'exists', singleValue: true },
		};
		const node = createNode({ payload, text: 'hello' });
		const nodeType = createNodeType([
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
			},
		]);

		expect(omitHiddenFilterRightValues('hello', 'text', node, nodeType)).toBe('hello');
		expect(omitHiddenFilterRightValues(payload, 'payload', node, nodeType)).toBe(payload);
		expect(omitHiddenFilterRightValues(payload, 'payload', node, undefined)).toBe(payload);
	});
});
