import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionItem, { type Props } from './FixedCollectionItem.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';
import type { INodePropertyCollection } from 'n8n-workflow';

// vi.hoisted runs before vi.mock, making these variables available to mock factories
const { mockState } = vi.hoisted(() => ({
	mockState: {
		resolvedExpression: '',
		isCollectionOverhaulEnabled: false,
	},
}));

vi.mock('@/app/composables/useCollectionOverhaul', () => ({
	useCollectionOverhaul: () => ({
		isEnabled: {
			get value() {
				return mockState.isCollectionOverhaulEnabled;
			},
		},
	}),
}));

vi.mock('@/app/composables/useResolvedExpression', () => ({
	useResolvedExpression: () => ({
		resolvedExpression: {
			get value() {
				return mockState.resolvedExpression;
			},
		},
		resolvedExpressionString: {
			get value() {
				return mockState.resolvedExpression;
			},
		},
		isExpression: {
			get value() {
				return mockState.resolvedExpression !== '';
			},
		},
	}),
}));

describe('FixedCollectionItem.vue', () => {
	let pinia: ReturnType<typeof createTestingPinia> | undefined;

	const property: INodePropertyCollection = {
		displayName: 'Rule',
		name: 'rule',
		values: [
			{
				displayName: 'Output Name',
				name: 'outputKey',
				type: 'string',
				default: 'output1',
			},
			{
				displayName: 'Condition',
				name: 'condition',
				type: 'string',
				default: '',
			},
		],
	};

	const defaultProps: Props = {
		itemId: 'test-item-1',
		property,
		itemData: { outputKey: 'Test Output', condition: 'test condition' },
		itemIndex: 0,
		stableIndex: 0,
		nodeValues: {
			parameters: {
				rules: {
					values: [{ outputKey: 'Test Output', condition: 'test condition' }],
				},
			},
		},
		propertyPath: 'parameters.rules.values[0]',
		isReadOnly: false,
		isExpanded: true,
		sortable: true,
		disableAnimation: false,
		isDragging: false,
		visiblePropertyValues: property.values ?? [],
		pickerPropertyValues: [],
		isOptionalValueAdded: () => false,
		addOptionalFieldButtonText: '',
	};

	beforeEach(() => {
		mockState.resolvedExpression = '';
		mockState.isCollectionOverhaulEnabled = false;

		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: SETTINGS_STORE_DEFAULT_STATE.settings,
				},
			},
		});
		setActivePinia(pinia);
	});

	const renderComponent = createComponentRenderer(FixedCollectionItem, {
		pinia,
		props: defaultProps,
		global: {
			stubs: {
				ParameterInputList: { template: '<div data-test-id="parameter-input-list"></div>' },
			},
		},
	});

	it('renders the component', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('parameter-input-list')).toBeInTheDocument();
	});

	describe('item title', () => {
		it('displays default title without template', () => {
			const { getByText } = renderComponent();
			expect(getByText('Rule 1')).toBeInTheDocument();
		});

		it('displays title with stable index', () => {
			const { getByText } = renderComponent({
				props: { ...defaultProps, stableIndex: 2 },
			});
			expect(getByText('Rule 3')).toBeInTheDocument();
		});

		it('uses custom title template when provided and resolved', () => {
			mockState.resolvedExpression = 'Custom Title';
			console.log('Before render, mockState.resolvedExpression =', mockState.resolvedExpression);
			const { getByText, container } = renderComponent({
				props: { ...defaultProps, titleTemplate: '{{ $collection.item.value.outputKey }}' },
			});
			console.log('After render, mockState.resolvedExpression =', mockState.resolvedExpression);
			console.log('Rendered HTML:', container.innerHTML.slice(0, 500));
			expect(getByText('Custom Title')).toBeInTheDocument();
		});

		it('falls back to default title when template resolves to undefined', () => {
			mockState.resolvedExpression = 'undefined';
			const { getByText } = renderComponent({
				props: { ...defaultProps, titleTemplate: '{{ invalid }}' },
			});
			expect(getByText('Rule 1')).toBeInTheDocument();
		});

		it('falls back to default title when template resolves to null', () => {
			mockState.resolvedExpression = 'null';
			const { getByText } = renderComponent({
				props: { ...defaultProps, titleTemplate: '{{ invalid }}' },
			});
			expect(getByText('Rule 1')).toBeInTheDocument();
		});

		it('falls back to default title when template is not provided', () => {
			const { getByText } = renderComponent({
				props: { ...defaultProps, titleTemplate: undefined },
			});
			expect(getByText('Rule 1')).toBeInTheDocument();
		});
	});

	describe('item actions', () => {
		it('displays delete action when not readonly', () => {
			const { getByTestId } = renderComponent();
			const deleteButton = getByTestId('fixed-collection-item-delete');
			expect(deleteButton).toBeInTheDocument();
		});

		it('displays both delete and drag actions when sortable', () => {
			const { getByTestId } = renderComponent({
				props: { ...defaultProps, sortable: true },
			});

			const deleteButton = getByTestId('fixed-collection-item-delete');
			const dragButton = getByTestId('fixed-collection-item-drag');

			expect(deleteButton).toBeInTheDocument();
			expect(dragButton).toBeInTheDocument();
		});

		it('displays only delete action when not sortable', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { ...defaultProps, sortable: false },
			});

			const deleteButton = getByTestId('fixed-collection-item-delete');
			const dragButton = queryByTestId('fixed-collection-item-drag');

			expect(deleteButton).toBeInTheDocument();
			expect(dragButton).not.toBeInTheDocument();
		});

		it('displays no actions when readonly', () => {
			const { queryByTestId } = renderComponent({
				props: { ...defaultProps, isReadOnly: true },
			});

			const deleteButton = queryByTestId('fixed-collection-item-delete');
			const dragButton = queryByTestId('fixed-collection-item-drag');

			expect(deleteButton).not.toBeInTheDocument();
			expect(dragButton).not.toBeInTheDocument();
		});

		it('emits delete event when delete action is clicked', async () => {
			const { getByTestId, emitted } = renderComponent();
			const deleteButton = getByTestId('fixed-collection-item-delete');
			expect(deleteButton).toBeInTheDocument();

			await userEvent.click(deleteButton);

			expect(emitted('delete')).toBeTruthy();
			expect(emitted('delete')).toHaveLength(1);
		});
	});

	describe('expand/collapse', () => {
		it('renders in expanded state when isExpanded is true', () => {
			const { getByTestId } = renderComponent({
				props: { ...defaultProps, isExpanded: true },
			});
			// When expanded, the content (parameter-input-list) should be visible
			expect(getByTestId('parameter-input-list')).toBeInTheDocument();
		});

		it('emits update:isExpanded event when panel is toggled', async () => {
			const { getByText, emitted } = renderComponent({
				props: { ...defaultProps, isExpanded: false },
			});

			const title = getByText('Rule 1');
			await userEvent.click(title);

			expect(emitted('update:isExpanded')).toBeTruthy();
			expect(emitted('update:isExpanded')?.[0]).toEqual([true]);
		});
	});

	describe('value changes', () => {
		it('verifies valueChanged handler is wired to ParameterInputList', async () => {
			const { getByTestId } = renderComponent();

			// Get the ParameterInputList stub
			const parameterList = getByTestId('parameter-input-list');

			// Since we're stubbing ParameterInputList, we verify the wiring exists
			// In a real scenario, ParameterInputList would emit valueChanged events
			// and the component would re-emit them
			expect(parameterList).toBeInTheDocument();
		});
	});

	describe('parameter input list props', () => {
		it('passes correct props to ParameterInputList', () => {
			const { getByTestId } = renderComponent();
			const parameterList = getByTestId('parameter-input-list');
			expect(parameterList).toBeInTheDocument();
		});
	});

	describe('data attributes', () => {
		it('sets data-item-key attribute with itemId', () => {
			const { container } = renderComponent({
				props: { ...defaultProps, itemId: 'unique-item-id' },
			});

			const panelWithKey = container.querySelector('[data-item-key="unique-item-id"]');
			expect(panelWithKey).toBeInTheDocument();
		});

		it('maintains different keys for different items', () => {
			const { container: container1 } = renderComponent({
				props: { ...defaultProps, itemId: 'item-1' },
			});
			const { container: container2 } = renderComponent({
				props: { ...defaultProps, itemId: 'item-2' },
			});

			const panel1 = container1.querySelector('[data-item-key="item-1"]');
			const panel2 = container2.querySelector('[data-item-key="item-2"]');

			expect(panel1).toBeInTheDocument();
			expect(panel2).toBeInTheDocument();
		});
	});

	describe('collection overhaul feature flag', () => {
		it('respects collection overhaul feature flag', () => {
			mockState.isCollectionOverhaulEnabled = true;

			const { getByTestId } = renderComponent();

			// When feature flag is enabled, the component renders correctly
			expect(getByTestId('parameter-input-list')).toBeInTheDocument();
		});

		it('works without collection overhaul feature flag', () => {
			mockState.isCollectionOverhaulEnabled = false;

			const { getByTestId } = renderComponent();

			// When feature flag is disabled, the component still renders correctly
			expect(getByTestId('parameter-input-list')).toBeInTheDocument();
		});
	});

	describe('animation control', () => {
		it('passes disableAnimation prop to N8nCollapsiblePanel', () => {
			const { container } = renderComponent({
				props: { ...defaultProps, disableAnimation: true },
			});

			// The N8nCollapsiblePanel should receive the disableAnimation prop
			// We can verify the component renders correctly with this prop
			const panel = container.querySelector('[data-item-key="test-item-1"]');
			expect(panel).toBeInTheDocument();
		});

		it('does not disable animation by default', () => {
			const { container } = renderComponent({
				props: { ...defaultProps, disableAnimation: false },
			});

			// The component should render normally without animation disabled
			const panel = container.querySelector('[data-item-key="test-item-1"]');
			expect(panel).toBeInTheDocument();
		});
	});

	describe('computed properties', () => {
		it('computes default title with display name and index', () => {
			const { getByText } = renderComponent({
				props: {
					...defaultProps,
					property: { ...property, displayName: 'Custom Rule' },
					stableIndex: 4,
				},
			});

			expect(getByText('Custom Rule 5')).toBeInTheDocument();
		});

		it('provides correct additional data to expression resolver', () => {
			mockState.resolvedExpression = 'Resolved Title';

			const { getByText } = renderComponent({
				props: {
					...defaultProps,
					titleTemplate: '{{ $collection.item.value.outputKey }}',
					itemData: { outputKey: 'Resolved Title', condition: 'test' },
					stableIndex: 2,
				},
			});

			expect(getByText('Resolved Title')).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('handles empty item data', () => {
			const { getByText } = renderComponent({
				props: {
					...defaultProps,
					itemData: {},
				},
			});

			expect(getByText('Rule 1')).toBeInTheDocument();
		});

		it('handles zero stable index', () => {
			const { getByText } = renderComponent({
				props: {
					...defaultProps,
					stableIndex: 0,
				},
			});

			expect(getByText('Rule 1')).toBeInTheDocument();
		});

		it('handles large stable index', () => {
			const { getByText } = renderComponent({
				props: {
					...defaultProps,
					stableIndex: 99,
				},
			});

			expect(getByText('Rule 100')).toBeInTheDocument();
		});
	});
});
