import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FilterConditions from '@/components/FilterConditions/FilterConditions.vue';
import { STORES } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

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
							operator: {
								type: 'array',
								operation: 'contains',
								rightType: 'any',
							},
						},
						{
							leftValue: '={{ $json.meta }}',
							rightValue: '',
							operator: {
								type: 'object',
								operation: 'notEmpty',
								singleValue: true,
							},
						},
						{
							leftValue: '={{ $json.test }}',
							rightValue: 'other',
							operator: {
								type: 'string',
								operation: 'equals',
								singleValue: true,
							},
						},
					],
					combinator: 'or',
				},
			},
		});
		expect(getByTestId('filter-conditions')).toBeInTheDocument();
		const conditions = await findAllByTestId('filter-condition');
		const combinators = await findAllByTestId('filter-combinator-select');

		expect(combinators).toHaveLength(2);
		expect(combinators[0].querySelector('input')?.value).toEqual('OR');
		expect(combinators[1]).toHaveTextContent('OR');

		expect(conditions).toHaveLength(3);
		expect(conditions[0].querySelector('[data-test-id="filter-condition-left"]')).toHaveTextContent(
			'{{ $json.tags }}',
		);
		expect(
			conditions[0].querySelector('[data-test-id="filter-operator-select"]')?.querySelector('input')
				?.value,
		).toEqual('contains');
		expect(
			conditions[0].querySelector('[data-test-id="filter-condition-right"]')?.querySelector('input')
				?.value,
		).toEqual('exotic');

		expect(conditions[1].querySelector('[data-test-id="filter-condition-left"]')).toHaveTextContent(
			'{{ $json.meta }}',
		);
		expect(
			conditions[1].querySelector('[data-test-id="filter-operator-select"]')?.querySelector('input')
				?.value,
		).toEqual('is not empty');
		expect(conditions[1].querySelector('[data-test-id="filter-condition-right"]')).toBeNull();
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
							operator: {
								type: 'number',
								operation: 'equals',
							},
						},
						{
							leftValue: '={{ $json.num }}',
							rightValue: 'not a number',
							operator: {
								type: 'number',
								operation: 'equals',
							},
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

	it('renders correctly in read only mode', async () => {
		const { findAllByTestId, queryByTestId } = renderComponent({
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
});
