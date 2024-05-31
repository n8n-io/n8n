import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FilterConditions from '@/components/FilterConditions/FilterConditions.vue';
import { STORES } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within, waitFor } from '@testing-library/vue';
import { getFilterOperator } from '../utils';
import { get } from 'lodash-es';

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
		},
	}),
	props: {
		path: 'parameters.conditions',
		node: {
			parameters: {},
			id: 'f63efb2d-3cc5-4500-89f9-b39aab19baf5',
			name: 'If',
			type: 'n8n-nodes-base.if',
			typeVersion: 2,
			position: [1120, 380],
			credentials: {},
			disabled: false,
		},
		parameter: { name: 'conditions', displayName: 'Conditions' },
		value: {},
	},
};

const renderComponent = createComponentRenderer(FilterConditions, DEFAULT_SETUP);

describe('FilterConditions.vue', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default state properly', async () => {
		const { getByTestId, queryByTestId, findAllByTestId } = renderComponent();
		expect(getByTestId('filter-conditions')).toBeInTheDocument();
		expect(await findAllByTestId('filter-condition')).toHaveLength(1);
		expect(getByTestId('filter-condition-left')).toBeInTheDocument();
		expect(getByTestId('filter-operator-select')).toBeInTheDocument();

		// Only visible when multiple conditions
		expect(queryByTestId('filter-combinator-select')).not.toBeInTheDocument();
	});

	it('renders conditions with different operators', async () => {
		const { getByTestId, findAllByTestId } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: {
					options: {
						caseSensitive: true,
						leftValue: '',
					},
					conditions: [
						{
							leftValue: '={{ $json.tags }}',
							rightValue: 'exotic',
							operator: getFilterOperator('array:contains'),
						},
						{
							leftValue: '={{ $json.meta }}',
							rightValue: '',
							operator: getFilterOperator('object:notEmpty'),
						},
						{
							leftValue: '={{ $json.name }}',
							rightValue: 'John',
							operator: getFilterOperator('string:equals'),
						},
						{
							leftValue: '={{ $json.tags }}',
							rightValue: 5,
							operator: getFilterOperator('array:lengthGte'),
						},
					],
					combinator: 'or',
				},
			},
		});
		expect(getByTestId('filter-conditions')).toBeInTheDocument();
		const conditions = await findAllByTestId('filter-condition');
		const combinators = await findAllByTestId('filter-combinator-select');

		expect(combinators).toHaveLength(3);
		expect(combinators[0].querySelector('input')).toHaveValue('OR');
		expect(combinators[1]).toHaveTextContent('OR');

		expect(conditions).toHaveLength(4);

		// array:contains
		expect(within(conditions[0]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.tags }}',
		);
		expect(
			within(conditions[0]).getByTestId('filter-operator-select').querySelector('input'),
		).toHaveValue('contains');
		expect(
			within(conditions[0]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue('exotic');

		// object:notEmpty
		expect(within(conditions[1]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.meta }}',
		);
		expect(
			within(conditions[1]).getByTestId('filter-operator-select').querySelector('input'),
		).toHaveValue('is not empty');
		expect(within(conditions[1]).queryByTestId('filter-condition-right')).not.toBeInTheDocument();

		// string:equals
		expect(within(conditions[2]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.name }}',
		);
		expect(
			within(conditions[2]).getByTestId('filter-operator-select').querySelector('input'),
		).toHaveValue('is equal to');
		expect(
			within(conditions[2]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue('John');

		// array:lengthGte
		expect(within(conditions[3]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.tags }}',
		);
		expect(
			within(conditions[3]).getByTestId('filter-operator-select').querySelector('input'),
		).toHaveValue('length greater than or equal to');
		expect(
			within(conditions[3]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue(5);
	});

	it('renders parameter issues', async () => {
		const ndvStore = useNDVStore();
		vi.spyOn(ndvStore, 'activeNode', 'get').mockReturnValue({
			...DEFAULT_SETUP.props.node,
			issues: { parameters: { 'conditions.1': ['not a number sir'] } },
		} as never);

		const { getByTestId } = renderComponent({
			props: {
				...DEFAULT_SETUP.props,
				value: {
					conditions: [
						{
							leftValue: '={{ $json.num }}',
							rightValue: '5',
							operator: getFilterOperator('number:equals'),
						},
						{
							leftValue: '={{ $json.num }}',
							rightValue: 'not a number',
							operator: getFilterOperator('number:equals'),
						},
					],
				},
			},
		});

		expect(getByTestId('parameter-issues')).toBeInTheDocument();
	});

	it('renders correctly with typeOptions.multipleValues = false (single mode)', async () => {
		const { getByTestId, queryByTestId, findAllByTestId } = renderComponent({
			props: {
				...DEFAULT_SETUP.props,
				parameter: {
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						multipleValues: false,
					},
				},
			},
		});
		expect((await findAllByTestId('filter-condition')).length).toEqual(1);
		expect(getByTestId('filter-conditions')).toHaveClass('single');
		expect(queryByTestId('filter-add-condition')).not.toBeInTheDocument();
	});

	it('renders correctly with typeOptions.filter.leftValue', async () => {
		const { findAllByTestId } = renderComponent({
			props: {
				...DEFAULT_SETUP.props,
				parameter: {
					typeOptions: {
						filter: { leftValue: 'leftValue is always this' },
					},
				},
			},
		});

		const conditions = await findAllByTestId('filter-condition');
		expect(conditions[0].querySelector('[data-test-id="filter-condition-left"]')).toBeNull();
	});

	it('renders correctly with typeOptions.filter.allowedCombinators', async () => {
		const { getByTestId } = renderComponent({
			props: {
				...DEFAULT_SETUP.props,
				value: {
					conditions: [
						{
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
						{
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
					],
				},
				parameter: {
					typeOptions: {
						filter: { allowedCombinators: ['or'] },
					},
				},
			},
		});

		expect(getByTestId('filter-combinator-select')).toHaveTextContent('OR');
	});

	it('renders correctly with typeOptions.filter.maxConditions', async () => {
		const { getByTestId } = renderComponent({
			props: {
				...DEFAULT_SETUP.props,
				value: {
					conditions: [
						{
							leftValue: 'foo',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'bar',
						},
						{
							leftValue: 'foo',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'bar',
						},
					],
				},
				parameter: {
					typeOptions: {
						filter: { maxConditions: 2 },
					},
				},
			},
		});

		expect(getByTestId('filter-add-condition')).toBeDisabled();
		expect(getByTestId('filter-add-condition').title).toEqual('Maximum conditions reached');
	});

	it('can add and remove conditions', async () => {
		const { getByTestId, findAllByTestId } = renderComponent(DEFAULT_SETUP);
		await userEvent.click(getByTestId('filter-add-condition'));

		let conditions = await findAllByTestId('filter-condition');
		expect(conditions.length).toEqual(2);

		await userEvent.click(within(conditions[0]).getByTestId('filter-remove-condition'));

		conditions = await findAllByTestId('filter-condition');
		expect(conditions.length).toEqual(1);
		expect(conditions[0].querySelector('[data-test-id="filter-remove-condition"]')).toBeNull();
	});

	it('can edit conditions', async () => {
		const { getByTestId, emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: {
					options: {
						caseSensitive: true,
						leftValue: '',
					},
					conditions: [
						{
							leftValue: '={{ $json.name }}',
							rightValue: 'John',
							operator: getFilterOperator('string:equals'),
						},
					],
				},
			},
		});

		const condition = getByTestId('filter-condition');
		await waitFor(() =>
			expect(within(condition).getByTestId('filter-condition-left')).toHaveTextContent(
				'{{ $json.name }}',
			),
		);

		expect(emitted('valueChanged')).toBeUndefined();

		const expressionEditor = within(condition)
			.getByTestId('filter-condition-left')
			.querySelector('.cm-line');

		if (expressionEditor) {
			await userEvent.type(expressionEditor, 'test');
		}

		await waitFor(() => {
			expect(get(emitted('valueChanged')[0], '0.value.conditions.0.leftValue')).toEqual(
				expect.stringContaining('test'),
			);
		});

		const parameterInput = within(condition)
			.getByTestId('filter-condition-right')
			.querySelector('input');

		if (parameterInput) {
			await userEvent.type(parameterInput, 'test');
		}

		await waitFor(() => {
			expect(get(emitted('valueChanged')[0], '0.value.conditions.0.leftValue')).toEqual(
				expect.stringContaining('test'),
			);
			expect(get(emitted('valueChanged')[0], '0.value.conditions.0.rightValue')).toEqual(
				expect.stringContaining('test'),
			);
		});
	});

	it('renders correctly in read only mode', async () => {
		const { findAllByTestId, queryByTestId } = renderComponent({
			props: {
				...DEFAULT_SETUP.props,
				value: {
					conditions: [
						{
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
						{
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
					],
				},
				readOnly: true,
			},
		});

		expect(queryByTestId('filter-add-condition')).not.toBeInTheDocument();

		const conditions = await findAllByTestId('filter-condition');

		for (const condition of conditions) {
			const removeButton = within(condition).queryByTestId('filter-remove-condition');
			expect(removeButton).not.toBeInTheDocument();

			const left = within(condition).getByTestId('filter-condition-left');
			expect(left.querySelector('input')).toBeDisabled();

			const right = within(condition).getByTestId('filter-condition-right');
			expect(right.querySelector('input')).toBeDisabled();

			const operatorSelect = within(condition).getByTestId('filter-operator-select');
			expect(operatorSelect.querySelector('input')).toBeDisabled();
		}
	});

	it('re-renders when value prop changes', async () => {
		const { findAllByTestId, rerender } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: {
					conditions: [
						{
							id: '1',
							leftValue: 'foo',
							rightValue: 'bar',
							operator: getFilterOperator('string:equals'),
						},
					],
					combinator: 'and',
				},
			},
		});

		// Rerender with different conditions
		await rerender({
			value: {
				conditions: [
					{
						id: '2',
						leftValue: 'quz',
						rightValue: 'qux',
						operator: getFilterOperator('string:notEquals'),
					},
					{
						id: '3',
						leftValue: 5,
						rightValue: 6,
						operator: getFilterOperator('number:gt'),
					},
				],
				combinator: 'and',
			},
		});

		const conditions = await findAllByTestId('filter-condition');
		expect(conditions).toHaveLength(2);

		expect(
			within(conditions[0]).getByTestId('filter-condition-left').querySelector('input'),
		).toHaveValue('quz');
		expect(
			within(conditions[0]).getByTestId('filter-operator-select').querySelector('input'),
		).toHaveValue('is not equal to');
		expect(
			within(conditions[0]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue('qux');
		expect(
			within(conditions[1]).getByTestId('filter-condition-left').querySelector('input'),
		).toHaveValue(5);
		expect(
			within(conditions[1]).getByTestId('filter-operator-select').querySelector('input'),
		).toHaveValue('is greater than');
		expect(
			within(conditions[1]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue(6);
	});
});
