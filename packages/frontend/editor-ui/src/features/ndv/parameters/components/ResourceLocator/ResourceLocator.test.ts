import type { INodeListSearchResult } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ResourceLocator from './ResourceLocator.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { mockedStore } from '@/__tests__/utils';
import { vi } from 'vitest';
import {
	TEST_MODEL_VALUE,
	TEST_NODE_MULTI_MODE,
	TEST_NODE_SINGLE_MODE,
	TEST_NODE_NO_CREDENTIALS,
	TEST_NODE_URL_REDIRECT,
	TEST_PARAMETER_ADD_RESOURCE,
	TEST_PARAMETER_MULTI_MODE,
	TEST_PARAMETER_SINGLE_MODE,
	TEST_PARAMETER_SKIP_CREDENTIALS_CHECK,
	TEST_PARAMETER_URL_REDIRECT,
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
vi.mock('@/app/composables/useWorkflowHelpers', () => {
	return {
		useWorkflowHelpers: vi.fn(() => ({
			resolveExpression: vi.fn().mockImplementation((val) => val),
			resolveRequiredParameters: vi.fn().mockImplementation((_, params) => params),
		})),
	};
});
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

// Mock window.open
vi.spyOn(window, 'open').mockImplementation(() => null);

let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

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
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProjectId = 'test-project-123';
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
		// Focus on the input to fetch resources (the dropdown opens on focus)
		const input = getByTestId('rlc-input');
		await fireEvent.focus(input);
		// Wait for the resources to be fetched
		await waitFor(() => {
			expect(nodeTypesStore.getResourceLocatorResults).toHaveBeenCalled();
		});
		// Expect the items to be rendered, including the cached value from
		// TEST_MODEL_VALUE
		expect(getAllByTestId('rlc-item')).toHaveLength(TEST_ITEMS.length + 1);
		// We should be getting one item for each result
		TEST_ITEMS.forEach((item) => {
			expect(getByText(item.name)).toBeInTheDocument();
		});
	});

	it('renders add resource button', async () => {
		nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
			results: [],
			paginationToken: null,
		});
		const { getByTestId } = renderComponent({
			props: {
				modelValue: TEST_MODEL_VALUE,
				parameter: TEST_PARAMETER_ADD_RESOURCE,
				path: `parameters.${TEST_PARAMETER_ADD_RESOURCE.name}`,
				node: TEST_NODE_SINGLE_MODE,
				displayTitle: 'Test Resource Locator',
				expressionComputedValue: '',
			},
		});

		expect(getByTestId(`resource-locator-${TEST_PARAMETER_ADD_RESOURCE.name}`)).toBeInTheDocument();
		// Click on the input to open it
		await userEvent.click(getByTestId('rlc-input'));
		// Expect the button to create a new resource to be rendered
		expect(getByTestId('rlc-item-add-resource')).toBeInTheDocument();
	});

	it('creates new resource passing search filter as name', async () => {
		nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
			results: [],
			paginationToken: null,
		});
		nodeTypesStore.getNodeParameterActionResult.mockResolvedValue('new-resource');

		const { getByTestId } = renderComponent({
			props: {
				modelValue: TEST_MODEL_VALUE,
				parameter: TEST_PARAMETER_ADD_RESOURCE,
				path: `parameters.${TEST_PARAMETER_ADD_RESOURCE.name}`,
				node: TEST_NODE_SINGLE_MODE,
				displayTitle: 'Test Resource Locator',
				expressionComputedValue: '',
			},
		});

		// Click on the input to open it
		await userEvent.click(getByTestId('rlc-input'));
		// Type in the input to name the resource
		await userEvent.type(getByTestId('rlc-search'), 'Test Resource');
		// Click on the add resource button
		await userEvent.click(getByTestId('rlc-item-add-resource'));

		expect(nodeTypesStore.getNodeParameterActionResult).toHaveBeenCalledWith({
			nodeTypeAndVersion: {
				name: TEST_NODE_SINGLE_MODE.type,
				version: TEST_NODE_SINGLE_MODE.typeVersion,
			},
			path: `parameters.${TEST_PARAMETER_ADD_RESOURCE.name}`,
			currentNodeParameters: expect.any(Object),
			credentials: TEST_NODE_SINGLE_MODE.credentials,
			handler: 'testAddResource',
			payload: {
				name: 'Test Resource',
			},
		});
	});

	it('renders error when credentials are required and skipCredentialsCheckInRLC is false', async () => {
		nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
			results: [
				{
					name: 'Test Resource',
					value: 'test-resource',
					url: 'https://test.com/test-resource',
				},
			],
			paginationToken: null,
		});
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
			displayName: 'Test Node',
			credentials: [
				{
					name: 'testAuth',
					required: true,
				},
			],
		});

		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				modelValue: TEST_MODEL_VALUE,
				parameter: TEST_PARAMETER_MULTI_MODE,
				path: `parameters.${TEST_PARAMETER_MULTI_MODE.name}`,
				node: TEST_NODE_NO_CREDENTIALS,
				displayTitle: 'Test Resource Locator',
				expressionComputedValue: '',
				isValueExpression: false,
			},
		});

		expect(getByTestId(`resource-locator-${TEST_PARAMETER_MULTI_MODE.name}`)).toBeInTheDocument();

		const input = getByTestId('rlc-input');
		await fireEvent.focus(input);

		expect(getByTestId('rlc-error-container')).toBeInTheDocument();
		expect(getByTestId('permission-error-link')).toBeInTheDocument();
		expect(queryByTestId('rlc-item')).not.toBeInTheDocument();
	});

	it('renders list items when skipCredentialsCheckInRLC is true even without credentials', async () => {
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
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
			displayName: 'Test Node',
			credentials: [
				{
					name: 'testAuth',
					required: true,
				},
			],
		});

		const { getByTestId, getByText, getAllByTestId, queryByTestId } = renderComponent({
			props: {
				modelValue: TEST_MODEL_VALUE,
				parameter: TEST_PARAMETER_SKIP_CREDENTIALS_CHECK,
				path: `parameters.${TEST_PARAMETER_SKIP_CREDENTIALS_CHECK.name}`,
				node: TEST_NODE_NO_CREDENTIALS,
				displayTitle: 'Test Resource Locator',
				expressionComputedValue: '',
				isValueExpression: false,
			},
		});

		expect(
			getByTestId(`resource-locator-${TEST_PARAMETER_SKIP_CREDENTIALS_CHECK.name}`),
		).toBeInTheDocument();

		const input = getByTestId('rlc-input');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(nodeTypesStore.getResourceLocatorResults).toHaveBeenCalled();
		});

		// Expect the items to be rendered, including the cached value from
		// TEST_MODEL_VALUE
		expect(getAllByTestId('rlc-item')).toHaveLength(TEST_ITEMS.length + 1);
		TEST_ITEMS.forEach((item) => {
			expect(getByText(item.name)).toBeInTheDocument();
		});
		expect(queryByTestId('rlc-error-container')).not.toBeInTheDocument();
		expect(queryByTestId('permission-error-link')).not.toBeInTheDocument();
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

			const input = getByTestId('rlc-input');
			await fireEvent.focus(input);
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

			const input = getByTestId('rlc-input');
			await fireEvent.focus(input);

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

	it('opens URL in new tab when add resource button is clicked with URL configuration', async () => {
		const windowOpenSpy = vi.spyOn(window, 'open');
		nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
			results: [],
			paginationToken: null,
		});

		const { getByTestId } = renderComponent({
			props: {
				modelValue: TEST_MODEL_VALUE,
				parameter: TEST_PARAMETER_URL_REDIRECT,
				path: `parameters.${TEST_PARAMETER_URL_REDIRECT.name}`,
				node: TEST_NODE_URL_REDIRECT,
				displayTitle: 'Test Resource Locator',
				expressionComputedValue: '',
			},
		});

		await userEvent.click(getByTestId('rlc-input'));

		await userEvent.click(getByTestId('rlc-item-add-resource'));

		expect(windowOpenSpy).toHaveBeenCalledWith(
			'/projects/test-project-123/datatables/new',
			'_blank',
		);

		expect(nodeTypesStore.getNodeParameterActionResult).not.toHaveBeenCalled();
	});

	describe('slow load notice', () => {
		it('should pass slowLoadNotice configuration to dropdown component', async () => {
			vi.useFakeTimers();
			const SLOW_LOAD_PARAMETER = {
				...TEST_PARAMETER_SINGLE_MODE,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list' as const,
						typeOptions: {
							searchListMethod: 'getItems',
							slowLoadNotice: {
								message: 'This is taking longer than expected',
								timeout: 500,
							},
						},
					},
				],
			};

			// Use a slow response to keep loading state
			let resolvePromise: ((value: INodeListSearchResult) => void) | undefined;
			nodeTypesStore.getResourceLocatorResults.mockReturnValue(
				new Promise((resolve) => {
					resolvePromise = resolve;
				}),
			);

			const { getByTestId, queryByText } = renderComponent({
				props: {
					modelValue: TEST_MODEL_VALUE,
					parameter: SLOW_LOAD_PARAMETER,
					path: `parameters.${SLOW_LOAD_PARAMETER.name}`,
					node: TEST_NODE_SINGLE_MODE,
					displayTitle: 'Test Resource Locator',
					expressionComputedValue: '',
				},
			});

			// Focus to open dropdown - Focus triggers onInputFocus -> showResourceDropdown
			// Use fireEvent instead of userEvent because userEvent doesn't work with fake timers
			await fireEvent.focus(getByTestId('rlc-input'));
			await vi.advanceTimersByTimeAsync(100);

			// Advance time past the slowLoadNotice timeout (500ms)
			await vi.advanceTimersByTimeAsync(600);

			expect(queryByText('This is taking longer than expected')).toBeInTheDocument();

			if (resolvePromise) {
				resolvePromise({ results: [], paginationToken: null });
			}
			vi.useRealTimers();
		}, 10000);

		it('should not show notice when dropdown is not visible', async () => {
			vi.useFakeTimers();
			const SLOW_LOAD_PARAMETER = {
				...TEST_PARAMETER_SINGLE_MODE,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list' as const,
						typeOptions: {
							searchListMethod: 'getItems',
							slowLoadNotice: {
								message: 'This is taking longer than expected',
								timeout: 100,
							},
						},
					},
				],
			};

			nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
				results: [],
				paginationToken: null,
			});

			const { queryByText } = renderComponent({
				props: {
					modelValue: TEST_MODEL_VALUE,
					parameter: SLOW_LOAD_PARAMETER,
					path: `parameters.${SLOW_LOAD_PARAMETER.name}`,
					node: TEST_NODE_SINGLE_MODE,
					displayTitle: 'Test Resource Locator',
					expressionComputedValue: '',
				},
			});

			await vi.advanceTimersByTimeAsync(200);
			expect(queryByText('This is taking longer than expected')).not.toBeInTheDocument();
			vi.useRealTimers();
		});

		it('should hide notice when loading completes', async () => {
			vi.useFakeTimers();
			const SLOW_LOAD_PARAMETER = {
				...TEST_PARAMETER_SINGLE_MODE,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list' as const,
						typeOptions: {
							searchListMethod: 'getItems',
							slowLoadNotice: {
								message: 'This is taking longer than expected',
								timeout: 100,
							},
						},
					},
				],
			};

			nodeTypesStore.getResourceLocatorResults.mockResolvedValue({
				results: [{ name: 'Test Item', value: 'test-item' }],
				paginationToken: null,
			});

			const { getByTestId, queryByText } = renderComponent({
				props: {
					modelValue: TEST_MODEL_VALUE,
					parameter: SLOW_LOAD_PARAMETER,
					path: `parameters.${SLOW_LOAD_PARAMETER.name}`,
					node: TEST_NODE_SINGLE_MODE,
					displayTitle: 'Test Resource Locator',
					expressionComputedValue: '',
				},
			});

			// Focus to open dropdown
			// Use fireEvent instead of userEvent because userEvent doesn't work with fake timers
			await fireEvent.focus(getByTestId('rlc-input'));

			// Allow time for loading to complete - the mock resolves immediately
			await vi.advanceTimersByTimeAsync(200);

			// Since the mock resolves immediately, the loading should be complete
			// and the slow load notice should not be shown (timeout is 100ms, but loading finishes faster)
			expect(queryByText('This is taking longer than expected')).not.toBeInTheDocument();
			vi.useRealTimers();
		});

		it('should not show notice when slowLoadNotice is not configured', async () => {
			vi.useFakeTimers();
			let resolvePromise: ((value: INodeListSearchResult) => void) | undefined;
			nodeTypesStore.getResourceLocatorResults.mockReturnValue(
				new Promise((resolve) => {
					resolvePromise = resolve;
				}),
			);

			const { getByTestId } = renderComponent({
				props: {
					modelValue: TEST_MODEL_VALUE,
					parameter: TEST_PARAMETER_SINGLE_MODE,
					path: `parameters.${TEST_PARAMETER_SINGLE_MODE.name}`,
					node: TEST_NODE_SINGLE_MODE,
					displayTitle: 'Test Resource Locator',
					expressionComputedValue: '',
				},
			});

			// Focus to open dropdown
			// Use fireEvent instead of userEvent because userEvent doesn't work with fake timers
			await fireEvent.focus(getByTestId('rlc-input'));

			await vi.advanceTimersByTimeAsync(500);

			const noticeContainer = document.querySelector('[class*="slowLoadNoticeContainer"]');
			expect(noticeContainer).not.toBeInTheDocument();

			if (resolvePromise) {
				resolvePromise({ results: [], paginationToken: null });
			}
			vi.useRealTimers();
		});
	});
});
