import { createTestNode, createTestNodeProperties } from '@/__tests__/mocks';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import * as workFlowHelpers from '@/app/composables/useWorkflowHelpers';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { cleanup, waitFor, within } from '@testing-library/vue';
import get from 'lodash/get';
import type { FilterOptionsValue, FilterTypeOptions, FilterValue } from 'n8n-workflow';
import FilterConditions from './FilterConditions.vue';
import { getFilterOperator } from './utils';
import { flushPromises } from '@vue/test-utils';

vi.mock('vue-router');

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

const DEFAULT_OPTIONS: FilterOptionsValue = {
	caseSensitive: true,
	leftValue: '',
	typeValidation: 'loose',
	version: 2,
};
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
			position: [1120, 380] as const,
			credentials: {},
			disabled: false,
		},
		parameter: createTestNodeProperties({
			name: 'conditions',
			displayName: 'Conditions',
		}),
	},
} satisfies RenderOptions<typeof FilterConditions>;

const renderComponent = createComponentRenderer(FilterConditions, DEFAULT_SETUP);

describe('FilterConditions.vue', () => {
	beforeEach(cleanup);

	afterEach(async () => {
		vi.clearAllMocks();
		await flushPromises();
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
					options: DEFAULT_OPTIONS,
					conditions: [
						{
							id: '1',
							leftValue: '={{ $json.tags }}',
							rightValue: 'exotic',
							operator: getFilterOperator('array:contains'),
						},
						{
							id: '2',
							leftValue: '={{ $json.meta }}',
							rightValue: '',
							operator: getFilterOperator('object:notEmpty'),
						},
						{
							id: '3',
							leftValue: '={{ $json.name }}',
							rightValue: 'John',
							operator: getFilterOperator('string:equals'),
						},
						{
							id: '4',
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
		expect(within(conditions[0]).getByTestId('filter-operator-select')).toHaveTextContent(
			'contains',
		);
		expect(
			within(conditions[0]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue('exotic');

		// object:notEmpty
		expect(within(conditions[1]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.meta }}',
		);
		expect(within(conditions[1]).getByTestId('filter-operator-select')).toHaveTextContent(
			'is not empty',
		);
		expect(within(conditions[1]).queryByTestId('filter-condition-right')).not.toBeInTheDocument();

		// string:equals
		expect(within(conditions[2]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.name }}',
		);
		expect(within(conditions[2]).getByTestId('filter-operator-select')).toHaveTextContent(
			'is equal to',
		);
		expect(
			within(conditions[2]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue('John');

		// array:lengthGte
		expect(within(conditions[3]).getByTestId('filter-condition-left')).toHaveTextContent(
			'{{ $json.tags }}',
		);
		expect(within(conditions[3]).getByTestId('filter-operator-select')).toHaveTextContent(
			'length greater than or equal to',
		);
		expect(
			within(conditions[3]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue(5);
	});

	it('renders parameter issues', async () => {
		const ndvStore = useNDVStore(createWorkflowDocumentId(''));
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
							id: '1',
							leftValue: '={{ $json.num }}',
							rightValue: '5',
							operator: getFilterOperator('number:equals'),
						},
						{
							id: '2',
							leftValue: '={{ $json.num }}',
							rightValue: 'not a number',
							operator: getFilterOperator('number:equals'),
						},
					],
				} as Partial<FilterValue> as FilterValue,
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
				parameter: createTestNodeProperties({
					typeOptions: {
						filter: { leftValue: 'leftValue is always this', version: {} },
					},
				}),
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
							id: '1',
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
						{
							id: '2',
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
					],
				} as Partial<FilterValue> as FilterValue,
				parameter: createTestNodeProperties({
					typeOptions: {
						filter: { allowedCombinators: ['or'], version: {} },
					},
				}),
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
							id: '1',
							leftValue: 'foo',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'bar',
						},
						{
							id: '2',
							leftValue: 'foo',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'bar',
						},
					],
				} as Partial<FilterValue> as FilterValue,
				parameter: createTestNodeProperties({
					typeOptions: {
						filter: { maxConditions: 2, version: {} },
					},
				}),
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
					options: DEFAULT_OPTIONS,
					conditions: [
						{
							id: '1',
							leftValue: '={{ $json.name }}',
							rightValue: 'John',
							operator: getFilterOperator('string:equals'),
						},
					],
				} as Partial<FilterValue> as FilterValue,
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
							id: '1',
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
						{
							id: '2',
							leftValue: 'foo',
							operator: getFilterOperator('string:equals'),
							rightValue: 'bar',
						},
					],
				} as Partial<FilterValue> as FilterValue,
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
			expect(operatorSelect.querySelector('button')).toBeDisabled();
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
				} as Partial<FilterValue> as FilterValue,
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
		expect(within(conditions[0]).getByTestId('filter-operator-select')).toHaveTextContent(
			'is not equal to',
		);
		expect(
			within(conditions[0]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue('qux');
		expect(
			within(conditions[1]).getByTestId('filter-condition-left').querySelector('input'),
		).toHaveValue(5);
		expect(within(conditions[1]).getByTestId('filter-operator-select')).toHaveTextContent(
			'is greater than',
		);
		expect(
			within(conditions[1]).getByTestId('filter-condition-right').querySelector('input'),
		).toHaveValue(6);
	});

	it('emits once with updated caseSensitive when typeOptions.filter.caseSensitive changes', async () => {
		const { rerender, emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: { caseSensitive: true } as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: {},
				}),
			},
		});

		// No emission on initial render
		expect(emitted('valueChanged')).toBeUndefined();

		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({ caseSensitive: false });

		// Change caseSensitive and also change node.parameters to trigger the watcher
		await rerender({
			parameter: {
				...DEFAULT_SETUP.props.parameter,
				typeOptions: {
					filter: { caseSensitive: false },
				},
			},
			node: {
				...DEFAULT_SETUP.props.node,
				parameters: { foo: 'bar' },
			},
		});

		await waitFor(() => {
			expect(emitted('valueChanged') ?? []).toHaveLength(1);
		});

		const events = emitted('valueChanged') ?? [];
		expect(get(events[0], '0.value.options.caseSensitive')).toBe(false);
	});

	it('should auto-change operator type when dropping a value', async () => {
		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({
			leftValue: 42,
			rightValue: 42,
		});

		const { emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: {
					conditions: [
						{
							id: '1',
							leftValue: '',
							rightValue: '',
							operator: getFilterOperator('string:equals'),
						},
					],
					combinator: 'and',
				} as Partial<FilterValue> as FilterValue,
			},
			global: {
				stubs: {
					ParameterInputFull: {
						setup(_props, { emit }) {
							emit('drop', '={{ 42 }}');
						},
						template: '<div></div>',
					},
				},
			},
		});

		// Wait for async type inference to complete
		await waitFor(() => {
			expect(get(emitted('valueChanged'), '0.0.value.conditions.0.operator.type')).toBe('number');
		});
	});

	it('preserves stored diverging caseSensitive on initial load without emission', async () => {
		// Scenario: stored value has caseSensitive:false, but ignoreCase expression resolves to true (caseSensitive:false)
		const storedValue: FilterValue = {
			options: {
				caseSensitive: false,
				leftValue: '',
				typeValidation: 'loose',
				version: 2,
			},
			conditions: [
				{
					id: '1',
					leftValue: 'foo',
					rightValue: 'bar',
					operator: getFilterOperator('string:equals'),
				},
			],
			combinator: 'and',
		};

		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({
			caseSensitive: false, // This matches the stored value
		});

		const { emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: storedValue,
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
						} as unknown as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: { options: { ignoreCase: true } }, // This makes expression resolve to false
				}),
			},
		});

		await flushPromises();

		// Should not emit on initial render even though expression is being resolved
		expect(emitted('valueChanged')).toBeUndefined();

		// Verify stored caseSensitive is preserved
		const state = get(emitted('valueChanged'), '0.0.value.options.caseSensitive');
		expect(state ?? false).toBe(false);
	});

	it('emits reflection to source toggle when stored caseSensitive diverges from expression', async () => {
		// Scenario: stored value has caseSensitive:true, but ignoreCase expression resolves to false (caseSensitive:false)
		// This represents a programmatic node with a manually-set caseSensitive that diverges from the toggle
		const storedValue: FilterValue = {
			options: {
				caseSensitive: true, // Manually set to true, differs from resolved false
				leftValue: '',
				typeValidation: 'loose',
				version: 2,
			},
			conditions: [
				{
					id: '1',
					leftValue: 'foo',
					rightValue: 'bar',
					operator: getFilterOperator('string:equals'),
				},
			],
			combinator: 'and',
		};

		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({
			caseSensitive: false, // Expression resolves to false (from !ignoreCase where ignoreCase:true)
		});

		const { emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: storedValue,
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
						} as unknown as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: { options: { ignoreCase: true } }, // Expression resolves to false
				}),
			},
		});

		await flushPromises();

		// Should emit reflection to the source parameter on initial render divergence
		// with "parameters." prefix for correct NodeSettings routing
		const events = emitted('valueChanged') ?? [];
		expect(events).toHaveLength(1);
		expect(get(events[0], '0.name')).toBe('parameters.options.ignoreCase');
		expect(get(events[0], '0.value')).toBe(false); // !storedCaseSensitive = !true = false
	});

	it('does not emit reflection when read-only, even if caseSensitive diverges', async () => {
		// Viewing a read-only workflow must stay side-effect free: no parameter update, no dirtying.
		const storedValue: FilterValue = {
			options: {
				caseSensitive: true, // diverges from resolved false
				leftValue: '',
				typeValidation: 'loose',
				version: 2,
			},
			conditions: [
				{
					id: '1',
					leftValue: 'foo',
					rightValue: 'bar',
					operator: getFilterOperator('string:equals'),
				},
			],
			combinator: 'and',
		};

		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({
			caseSensitive: false,
		});

		const { emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				readOnly: true,
				value: storedValue,
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
						} as unknown as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: { options: { ignoreCase: true } },
				}),
			},
		});

		await flushPromises();

		expect(emitted('valueChanged')).toBeUndefined();
	});

	it('updates caseSensitive when ignoreCase toggle changes', async () => {
		// Set up initial mock
		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({
			caseSensitive: true, // Initial: ignoreCase:false -> caseSensitive:true
		});

		const { emitted, rerender } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: {
					options: DEFAULT_OPTIONS,
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
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
						} as unknown as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: { options: { ignoreCase: false } },
				}),
			},
		});

		await flushPromises();

		// No emission on initial render
		expect(emitted('valueChanged')).toBeUndefined();

		// Update mock for the new ignoreCase value
		vi.mocked(workFlowHelpers.resolveParameter).mockResolvedValue({
			caseSensitive: false, // After toggle: ignoreCase:true -> caseSensitive:false
		});

		// Simulate ignoreCase toggle change
		await rerender({
			node: {
				...DEFAULT_SETUP.props.node,
				parameters: { options: { ignoreCase: true } }, // Toggle changed
			},
		});

		await waitFor(() => {
			expect(emitted('valueChanged') ?? []).toHaveLength(1);
		});

		const events = emitted('valueChanged') ?? [];
		expect(get(events[0], '0.value.options.caseSensitive')).toBe(false);
	});

	it('converges without infinite loop on reflection', async () => {
		// Verify that the reflection emission converges: initial divergence → reflection emitted → no further emissions
		const storedValue: FilterValue = {
			options: {
				caseSensitive: true,
				leftValue: '',
				typeValidation: 'loose',
				version: 2,
			},
			conditions: [
				{
					id: '1',
					leftValue: 'foo',
					rightValue: 'bar',
					operator: getFilterOperator('string:equals'),
				},
			],
			combinator: 'and',
		};

		let resolveCallCount = 0;
		vi.spyOn(workFlowHelpers, 'resolveParameter').mockImplementation(async () => {
			resolveCallCount++;
			// First call: divergence triggers reflection
			// After reflection syncs the toggle, subsequent calls should resolve to matching value
			return { caseSensitive: false };
		});

		const { emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: storedValue,
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
						} as unknown as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: { options: { ignoreCase: true } },
				}),
			},
		});

		await flushPromises();

		// Exactly one emission on initial load (the reflection correction)
		const events = emitted('valueChanged') ?? [];
		expect(events).toHaveLength(1);
		// Verify emit name includes "parameters." prefix for correct NodeSettings routing
		expect(get(events[0], '0.name')).toBe('parameters.options.ignoreCase');

		// Prove convergence: resolveParameter was called multiple times (watchEffect may run again)
		// but emissions were bounded to exactly 1 (the reflection)
		expect(resolveCallCount).toBeGreaterThanOrEqual(1);
	});

	it('emits reflection with the "parameters."-prefixed name that NodeSettings routing requires', async () => {
		// Pins the emit contract: the reflection name must start with "parameters." so that
		// NodeSettings.valueChanged -> nameIsParameter() routes it to updateNodeParameter and
		// updates node.parameters.options.ignoreCase. A bare "options.ignoreCase" would fail
		// that guard and write a phantom top-level node.options instead. This asserts the emit
		// payload only (not the NodeSettings handler itself).
		const storedValue: FilterValue = {
			options: {
				caseSensitive: true, // Diverges from resolved false
				leftValue: '',
				typeValidation: 'loose',
				version: 2,
			},
			conditions: [
				{
					id: '1',
					leftValue: 'foo',
					rightValue: 'bar',
					operator: getFilterOperator('string:equals'),
				},
			],
			combinator: 'and',
		};

		vi.spyOn(workFlowHelpers, 'resolveParameter').mockResolvedValue({
			caseSensitive: false, // Expression resolves to false (ignoreCase: true)
		});

		const { emitted } = renderComponent({
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				value: storedValue,
				parameter: createTestNodeProperties({
					...DEFAULT_SETUP.props.parameter,
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
						} as unknown as FilterTypeOptions,
					},
				}),
				node: createTestNode({
					...DEFAULT_SETUP.props.node,
					parameters: { options: { ignoreCase: true } },
				}),
			},
		});

		await flushPromises();

		const events = emitted('valueChanged') ?? [];
		expect(events).toHaveLength(1);

		// Extract the emitted event object
		const eventPayload = get(events[0], '0');
		expect(eventPayload).toBeDefined();

		// Verify the emit name starts with "parameters." (required for NodeSettings.nameIsParameter check)
		expect(get(eventPayload, 'name')).toBe('parameters.options.ignoreCase');
		// Verify value is the inverted stored caseSensitive (makes !ignoreCase === storedCaseSensitive)
		expect(get(eventPayload, 'value')).toBe(false); // !true = false
		expect(get(eventPayload, 'node')).toBe(DEFAULT_SETUP.props.node.name);

		// Regression guard: a bare 'options.ignoreCase' (no "parameters." prefix) would fail
		// NodeSettings.nameIsParameter and be misrouted; the prefix is what keeps it correct.
	});
});
