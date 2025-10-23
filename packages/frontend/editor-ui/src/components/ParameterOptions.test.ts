import { renderComponent } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { within, waitFor } from '@testing-library/vue';
import ParameterOptions from './ParameterOptions.vue';
import { setActivePinia, createPinia } from 'pinia';
import { createTestNodeProperties } from '@/__tests__/mocks';

const DEFAULT_PARAMETER = createTestNodeProperties({
	displayName: 'Fields to Set',
	name: 'assignments',
	type: 'assignmentCollection',
	default: {},
});

describe('ParameterOptions', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default options properly', () => {
		const { getByTestId } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				isReadOnly: false,
			},
		});
		expect(getByTestId('parameter-options-container')).toBeInTheDocument();
		expect(getByTestId('action-toggle')).toBeInTheDocument();
		expect(getByTestId('radio-button-fixed')).toBeInTheDocument();
		expect(getByTestId('radio-button-expression')).toBeInTheDocument();
	});

	it("doesn't render expression with showExpression set to false", () => {
		const { getByTestId, queryByTestId, container } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				isReadOnly: false,
				showExpressionSelector: false,
				value: 'manual',
			},
		});
		expect(getByTestId('parameter-options-container')).toBeInTheDocument();
		expect(getByTestId('action-toggle')).toBeInTheDocument();
		expect(queryByTestId('radio-button-fixed')).not.toBeInTheDocument();
		expect(queryByTestId('radio-button-expression')).not.toBeInTheDocument();
		expect(container.querySelector('.noExpressionSelector')).toBeInTheDocument();
	});

	it('should render loading state', () => {
		const CUSTOM_LOADING_MESSAGE = 'Loading...';
		const { getByTestId, getByText } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				isReadOnly: false,
				showExpressionSelector: false,
				value: 'manual',
				loading: true,
				loadingMessage: CUSTOM_LOADING_MESSAGE,
			},
		});
		expect(getByTestId('parameter-options-loader')).toBeInTheDocument();
		expect(getByText(CUSTOM_LOADING_MESSAGE)).toBeInTheDocument();
	});

	it('should render horizontal icon', () => {
		const { container } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				value: 'manual',
				isReadOnly: false,
				iconOrientation: 'horizontal',
			},
		});
		expect(container.querySelector('[data-icon="ellipsis"]')).toBeInTheDocument();
	});

	it('should render custom actions', async () => {
		const CUSTOM_ACTIONS = [
			{ label: 'Action 1', value: 'action1' },
			{ label: 'Action 2', value: 'action2' },
		];
		const { getByTestId } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				value: 'manual',
				isReadOnly: false,
				customActions: CUSTOM_ACTIONS,
			},
		});
		const actionToggle = getByTestId('action-toggle');
		const actionToggleButton = within(actionToggle).getByRole('button');
		expect(actionToggleButton).toBeVisible();
		await userEvent.click(actionToggle);
		const actionToggleId = actionToggleButton.getAttribute('aria-controls');
		const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
		expect(actionDropdown).toBeInTheDocument();
		// All custom actions should be rendered
		CUSTOM_ACTIONS.forEach((action) => {
			expect(within(actionDropdown).getByText(action.label)).toBeInTheDocument();
		});
	});

	it('should emit update:modelValue when changing to expression', async () => {
		const { emitted, getByTestId } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				value: 'manual',
				isReadOnly: false,
			},
		});
		expect(getByTestId('radio-button-expression')).toBeInTheDocument();
		await userEvent.click(getByTestId('radio-button-expression'));
		await waitFor(() => expect(emitted('update:modelValue')).toEqual([['addExpression']]));
	});

	it('should emit update:modelValue when changing to fixed', async () => {
		const { emitted, getByTestId } = renderComponent(ParameterOptions, {
			props: {
				parameter: DEFAULT_PARAMETER,
				value: '=manual',
				isReadOnly: false,
			},
		});
		expect(getByTestId('radio-button-fixed')).toBeInTheDocument();
		await userEvent.click(getByTestId('radio-button-fixed'));
		await waitFor(() => expect(emitted('update:modelValue')).toEqual([['removeExpression']]));
	});
});
