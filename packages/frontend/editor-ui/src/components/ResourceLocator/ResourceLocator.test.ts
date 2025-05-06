import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import ResourceLocator from './ResourceLocator.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { mockedStore } from '@/__tests__/utils';
import {
	TEST_MODEL_VALUE,
	TEST_NODE_MULTI_MODE,
	TEST_NODE_SINGLE_MODE,
	TEST_PARAMETER_MULTI_MODE,
	TEST_PARAMETER_SINGLE_MODE,
} from './ResourceLocator.test.constants';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	const location = {};
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
		useRoute: () => ({
			params,
			location,
		}),
	};
});
vi.mock('@/composables/useWorkflowHelpers', () => {
	return {
		useWorkflowHelpers: vi.fn(() => ({
			resolveExpression: vi.fn().mockImplementation((val) => val),
			resolveRequiredParameters: vi.fn().mockImplementation((_, params) => params),
		})),
	};
});
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

const renderComponent = createComponentRenderer(ResourceLocator, {
	props: {
		modelValue: TEST_MODEL_VALUE,
		parameter: TEST_PARAMETER_MULTI_MODE,
		path: `parameters.${TEST_PARAMETER_MULTI_MODE.name}`,
		node: TEST_NODE_MULTI_MODE,
		displayTitle: 'Test Resource Locator',
		expressionComputedValue: '',
		isValueExpression: false,
	},
	global: {
		stubs: {
			ResourceLocatorDropdown: false,
			ExpressionParameterInput: true,
			ParameterIssues: true,
			N8nCallout: true,
			'font-awesome-icon': true,
			FromAiOverrideField: true,
			FromAiOverrideButton: true,
			ParameterOverrideSelectableList: true,
		},
	},
});

describe('ResourceLocator', () => {
	beforeEach(() => {
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ displayName: 'Test Node' });
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders multi-mode correctly', async () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId(`resource-locator-${TEST_PARAMETER_MULTI_MODE.name}`)).toBeInTheDocument();
		// Should render mode selector with all available modes
		expect(getByTestId('rlc-mode-selector')).toBeInTheDocument();
		await userEvent.click(getByTestId('rlc-mode-selector'));
		TEST_PARAMETER_MULTI_MODE.modes?.forEach((mode) => {
			expect(screen.getByTestId(`mode-${mode.name}`)).toBeInTheDocument();
		});
	});

	it('renders single mode correctly', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				modelValue: TEST_MODEL_VALUE,
				parameter: TEST_PARAMETER_SINGLE_MODE,
				path: `parameters.${TEST_PARAMETER_SINGLE_MODE.name}`,
				node: TEST_NODE_SINGLE_MODE,
				displayTitle: 'Test Resource Locator',
				expressionComputedValue: '',
			},
		});
		expect(getByTestId(`resource-locator-${TEST_PARAMETER_SINGLE_MODE.name}`)).toBeInTheDocument();
		// Should not render mode selector
		expect(queryByTestId('rlc-mode-selector')).not.toBeInTheDocument();
	});

	it('renders fetched resources correctly', async () => {
		const TEST_ITEMS = [
			{ name: 'Test Resource', value: 'test-resource', url: 'https://test.com/test-resource' },
			{
				name: 'Test Resource 2',
				value: 'test-resource-2',
				url: 'https://test.com/test-resource-2',
			},
		];
		nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
			results: TEST_ITEMS,
			paginationToken: null,
		});
		const { getByTestId, getByText, getAllByTestId } = renderComponent();

		expect(getByTestId(`resource-locator-${TEST_PARAMETER_MULTI_MODE.name}`)).toBeInTheDocument();
		// Click on the input to fetch resources
		await userEvent.click(getByTestId('rlc-input'));
		// Wait for the resources to be fetched
		await waitFor(() => {
			expect(nodeTypesStore.getResourceLocatorResults).toHaveBeenCalled();
		});
		// Expect the items to be rendered
		expect(getAllByTestId('rlc-item')).toHaveLength(TEST_ITEMS.length);
		// We should be getting one item for each result
		TEST_ITEMS.forEach((item) => {
			expect(getByText(item.name)).toBeInTheDocument();
		});
	});

	// Testing error message deduplication
	describe('ResourceLocator credentials error handling', () => {
		it.each([
			{
				testName: 'period-separated credential message',
				error: {
					message: 'Authentication failed. Please check your credentials.',
					httpCode: '401',
					description: 'Authentication failed. Please check your credentials.',
				},
				expectedMessage: 'Authentication failed.',
			},
			{
				testName: 'dash-separated credential message',
				error: {
					message: 'Authentication failed - Please check your credentials.',
					httpCode: '401',
					description: 'Authentication failed. Please check your credentials.',
				},
				expectedMessage: 'Authentication failed',
			},
			{
				testName: 'credential message with "Perhaps" phrasing',
				error: {
					message: 'Authentication failed - Perhaps check your credentials?',
					httpCode: '401',
					description: 'Authentication failed. Please check your credentials.',
				},
				expectedMessage: 'Authentication failed',
			},
			{
				testName: 'singular credential phrasing',
				error: {
					message: 'Authentication failed. You should check your credential.',
					httpCode: '401',
					description: 'Authentication failed.',
				},
				expectedMessage: 'Authentication failed.',
			},
			{
				testName: 'verify credentials phrasing',
				error: {
					message: 'Authentication failed - Please verify your credentials.',
					httpCode: '401',
					description: 'Authentication failed.',
				},
				expectedMessage: 'Authentication failed',
			},
		])('$testName', async ({ error, expectedMessage }) => {
			nodeTypesStore.getResourceLocatorResults.mockRejectedValue(error);

			const { getByTestId, findByTestId } = renderComponent();

			expect(getByTestId(`resource-locator-${TEST_PARAMETER_MULTI_MODE.name}`)).toBeInTheDocument();

			await userEvent.click(getByTestId('rlc-input'));
			await waitFor(() => {
				expect(nodeTypesStore.getResourceLocatorResults).toHaveBeenCalled();
			});

			const errorContainer = await findByTestId('rlc-error-container');
			expect(errorContainer).toBeInTheDocument();

			expect(getByTestId('rlc-error-code')).toHaveTextContent(error.httpCode);
			expect(getByTestId('rlc-error-message')).toHaveTextContent(expectedMessage);

			expect(getByTestId('permission-error-link')).toBeInTheDocument();
		});

		it('renders generic error correctly', async () => {
			const TEST_500_ERROR = {
				message: 'Whoops',
				httpCode: '500',
				description: 'Something went wrong. Please try again later.',
			};

			nodeTypesStore.getResourceLocatorResults.mockRejectedValue(TEST_500_ERROR);
			const { getByTestId, findByTestId, queryByTestId } = renderComponent();

			expect(getByTestId(`resource-locator-${TEST_PARAMETER_MULTI_MODE.name}`)).toBeInTheDocument();

			await userEvent.click(getByTestId('rlc-input'));

			await waitFor(() => {
				expect(nodeTypesStore.getResourceLocatorResults).toHaveBeenCalled();
			});

			const errorContainer = await findByTestId('rlc-error-container');
			expect(errorContainer).toBeInTheDocument();

			expect(errorContainer).toHaveTextContent(TEST_500_ERROR.httpCode);
			expect(errorContainer).toHaveTextContent(TEST_500_ERROR.message);

			expect(queryByTestId('permission-error-link')).not.toBeInTheDocument();
		});
	});

	it('switches to expression when user enters "{{ "', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: { ...TEST_MODEL_VALUE, value: '', mode: 'id' } },
		});

		const input = getByTestId('rlc-input');
		await userEvent.click(input);
		const expression = new DataTransfer();
		// '{' is an escape character: '{{{{' === '{{'
		expression.setData('text', '{{ ');
		await userEvent.clear(input);
		await userEvent.paste(expression);

		expect(emitted('update:modelValue')).toEqual([
			[
				{
					__rl: true,
					mode: 'id',
					value: '={{  }}',
				},
			],
		]);
	});

	it('can switch between modes', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('rlc-mode-selector'));
		await userEvent.click(screen.getByTestId('mode-id'));
		expect(emitted('update:modelValue')).toEqual([
			[
				{
					__rl: true,
					mode: 'id',
					value: 'test',
				},
			],
		]);
	});
});
