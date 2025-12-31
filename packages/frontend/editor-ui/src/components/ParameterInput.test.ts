import { createComponentRenderer } from '@/__tests__/render';
import ParameterInput from '@/components/ParameterInput.vue';
import type { useNDVStore } from '@/stores/ndv.store';
import type { CompletionResult } from '@codemirror/autocomplete';
import { createTestingPinia } from '@pinia/testing';
import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { cleanupAppModals, createAppModals, mockedStore } from '@/__tests__/utils';
import { createEventBus } from '@n8n/utils/event-bus';
import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeParameterResourceLocator } from 'n8n-workflow';

function getNdvStateMock(): Partial<ReturnType<typeof useNDVStore>> {
	return {
		hasInputData: true,
		activeNode: {
			id: faker.string.uuid(),
			name: faker.word.words(3),
			parameters: {},
			position: [faker.number.int(), faker.number.int()],
			type: 'test',
			typeVersion: 1,
		},
		isInputPanelEmpty: false,
		isOutputPanelEmpty: false,
		ndvInputDataWithPinnedData: [],
		getHoveringItem: undefined,
		expressionOutputItemIndex: 0,
		isTableHoverOnboarded: false,
		setHighlightDraggables: vi.fn(),
	};
}

function getNodeTypesStateMock(): Partial<ReturnType<typeof useNodeTypesStore>> {
	return {
		allNodeTypes: [],
	};
}

let mockNdvState = getNdvStateMock();
let mockNodeTypesState = getNodeTypesStateMock();
let mockCompletionResult: Partial<CompletionResult> = {};

beforeEach(() => {
	mockNdvState = getNdvStateMock();
	mockNodeTypesState = getNodeTypesStateMock();
	mockCompletionResult = {};
	createAppModals();
});

vi.mock('@/stores/ndv.store', () => {
	return {
		useNDVStore: vi.fn(() => mockNdvState),
	};
});

vi.mock('@/stores/nodeTypes.store', () => {
	return {
		useNodeTypesStore: vi.fn(() => mockNodeTypesState),
	};
});

vi.mock('@/plugins/codemirror/completions/datatype.completions', () => {
	return {
		datatypeCompletions: vi.fn(() => mockCompletionResult),
	};
});

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
			resolve: vi.fn().mockReturnValue({
				href: '/projects/1/folders/1',
			}),
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ParameterInput, {
	pinia: createTestingPinia(),
});

const settingsStore = mockedStore(useSettingsStore);
const workflowsStore = mockedStore(useWorkflowsStore);

describe('ParameterInput.vue', () => {
	beforeEach(() => {
		mockNdvState = {
			hasInputData: true,
			activeNode: {
				id: faker.string.uuid(),
				name: faker.word.words(3),
				parameters: {},
				position: [faker.number.int(), faker.number.int()],
				type: 'test',
				typeVersion: 1,
			},
			isInputPanelEmpty: false,
			isOutputPanelEmpty: false,
			ndvInputDataWithPinnedData: [],
			getHoveringItem: undefined,
			expressionOutputItemIndex: 0,
			isTableHoverOnboarded: false,
			setHighlightDraggables: vi.fn(),
		};
		mockNodeTypesState = {
			allNodeTypes: [],
			getNodeType: vi.fn().mockReturnValue(null),
		};
		createAppModals();
		settingsStore.settings.enterprise = createMockEnterpriseSettings();
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	test('should render an options parameter (select)', async () => {
		const { container, baseElement, emitted } = renderComponent({
			props: {
				path: 'operation',
				parameter: {
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['sheet'] } },
					options: [
						{
							name: 'Append or Update Row',
							value: 'appendOrUpdate',
							description: 'Append a new row or update an existing one (upsert)',
							action: 'Append or update row in sheet',
						},
						{
							name: 'Append Row',
							value: 'append',
							description: 'Create a new row in a sheet',
							action: 'Append row in sheet',
						},
					],
					default: 'appendOrUpdate',
				},
				modelValue: 'appendOrUpdate',
			},
		});
		const select = container.querySelector('input') as HTMLInputElement;
		const selectTrigger = container.querySelector('.select-trigger') as HTMLElement;
		expect(select).toBeInTheDocument();
		expect(selectTrigger).toBeInTheDocument();
		await waitFor(() => expect(select).toHaveValue('Append or Update Row'));

		await userEvent.click(selectTrigger);

		const options = baseElement.querySelectorAll('.list-option');
		expect(options.length).toEqual(2);
		expect(options[0].querySelector('.option-headline')).toHaveTextContent('Append or Update Row');
		expect(options[0].querySelector('.option-description')).toHaveTextContent(
			'Append a new row or update an existing one (upsert)',
		);
		expect(options[1].querySelector('.option-headline')).toHaveTextContent('Append Row');
		expect(options[1].querySelector('.option-description')).toHaveTextContent(
			'Create a new row in a sheet',
		);

		await userEvent.click(options[1]);

		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: 'append' })]);
	});

	test('should render an options parameter even if it has invalid fields (like displayName)', async () => {
		// Test case based on the Schedule node
		// type=options parameters shouldn't have a displayName field, but some do
		const { container, baseElement, emitted } = renderComponent({
			props: {
				path: 'operation',
				parameter: {
					displayName: 'Trigger at Hour',
					name: 'triggerAtHour',
					type: 'options',
					default: 0,
					options: [
						{
							name: 'Midnight',
							displayName: 'Midnight',
							value: 0,
						},
						{
							name: '1am',
							displayName: '1am',
							value: 1,
						},
					],
					description: 'The hour of the day to trigger',
				},
				modelValue: 0,
			},
		});
		const select = container.querySelector('input') as HTMLInputElement;
		const selectTrigger = container.querySelector('.select-trigger') as HTMLElement;

		await waitFor(() => expect(select).toHaveValue('Midnight'));

		await userEvent.click(selectTrigger);

		const options = baseElement.querySelectorAll('.list-option');
		expect(options.length).toEqual(2);
		expect(options[0].querySelector('.option-headline')).toHaveTextContent('Midnight');
		expect(options[1].querySelector('.option-headline')).toHaveTextContent('1am');

		await userEvent.click(options[1]);

		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: 1 })]);
	});

	test('should render a string parameter', async () => {
		const { container, emitted } = renderComponent({
			props: {
				path: 'tag',
				parameter: {
					displayName: 'Tag',
					name: 'tag',
					type: 'string',
				},
				modelValue: '',
			},
		});
		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		await userEvent.type(input, 'foo');

		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: 'foo' })]);
	});

	describe('paste events', () => {
		async function paste(input: HTMLInputElement, text: string) {
			const expression = new DataTransfer();
			expression.setData('text', text);
			await userEvent.clear(input);
			await userEvent.paste(expression);
		}

		test('should handle pasting into a string parameter', async () => {
			const { container, emitted } = renderComponent({
				props: {
					path: 'tag',
					parameter: {
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
					},
					modelValue: '',
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeInTheDocument();
			await userEvent.click(input);

			await paste(input, 'foo');
			expect(emitted('update')).toContainEqual([expect.objectContaining({ value: 'foo' })]);

			await paste(input, '={{ $json.foo }}');
			expect(emitted('update')).toContainEqual([
				expect.objectContaining({ value: '={{ $json.foo }}' }),
			]);

			await paste(input, '=flDvzj%y1nP');
			expect(emitted('update')).toContainEqual([
				expect.objectContaining({ value: '==flDvzj%y1nP' }),
			]);
		});

		test('should handle pasting an expression into a number parameter', async () => {
			const { container, emitted } = renderComponent({
				props: {
					path: 'percentage',
					parameter: {
						displayName: 'Percentage',
						name: 'percentage',
						type: 'number',
					},
					modelValue: 1,
				},
			});
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeInTheDocument();
			await userEvent.click(input);

			await paste(input, '{{ $json.foo }}');
			expect(emitted('update')).toContainEqual([
				expect.objectContaining({ value: '={{ $json.foo }}' }),
			]);
		});
	});

	test('should not reset the value of a multi-select with loadOptionsMethod on load', async () => {
		mockNodeTypesState.getNodeParameterOptions = vi.fn(async () => [
			{ name: 'ID', value: 'id' },
			{ name: 'Title', value: 'title' },
			{ name: 'Description', value: 'description' },
		]);

		const { emitted, container } = renderComponent({
			props: {
				path: 'columns',
				parameter: {
					displayName: 'Columns',
					name: 'columns',
					type: 'multiOptions',
					typeOptions: { loadOptionsMethod: 'getColumnsMultiOptions' },
				},
				modelValue: ['id', 'title'],
			},
		});

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		// Nothing should be emitted
		expect(emitted('update')).toBeUndefined();
	});

	test('should show message when can not load options without credentials', async () => {
		mockNodeTypesState.getNodeParameterOptions = vi.fn(async () => {
			throw new Error('Node does not have any credentials set');
		});

		// @ts-expect-error Readonly property
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			displayName: 'Test',
			credentials: [
				{
					name: 'openAiApi',
					required: true,
				},
			],
		});

		const { emitted, container, getByTestId } = renderComponent({
			props: {
				path: 'columns',
				parameter: {
					displayName: 'Columns',
					name: 'columns',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getColumnsMultiOptions' },
				},
				modelValue: 'id',
			},
		});

		await waitFor(() => expect(getByTestId('parameter-input-field')).toBeInTheDocument());

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeInTheDocument();

		expect(mockNodeTypesState.getNodeParameterOptions).toHaveBeenCalled();

		expect(input.value.toLowerCase()).not.toContain('error');
		expect(input).toHaveValue('Set up credential to see options');

		expect(emitted('update')).toBeUndefined();
	});

	test('should render workflow selector without issues when selected workflow is not archived', async () => {
		const workflowId = faker.string.uuid();
		const modelValue = {
			mode: 'id',
			value: workflowId,
		};

		workflowsStore.allWorkflows = [
			{
				id: workflowId,
				name: 'Test',
				active: false,
				isArchived: false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				nodes: [],
				connections: {},
				versionId: faker.string.uuid(),
			},
		];

		const { emitted, container, getByTestId, queryByTestId } = renderComponent({
			props: {
				path: 'columns',
				parameter: {
					displayName: 'Workflow',
					name: 'workflowId',
					type: 'workflowSelector',
					default: '',
				},
				modelValue,
			},
		});

		await waitFor(() => expect(getByTestId('resource-locator-workflowId')).toBeInTheDocument());

		expect(container.querySelector('.has-issues')).not.toBeInTheDocument();

		const inputs = container.querySelectorAll('input');
		const mode = inputs[0];
		expect(mode).toBeInTheDocument();
		expect(mode).toHaveValue('By ID');

		const value = inputs[1];
		expect(value).toBeInTheDocument();
		expect(value).toHaveValue(workflowId);

		expect(queryByTestId('parameter-issues')).not.toBeInTheDocument();

		expect(emitted('update')).toBeUndefined();
	});

	test('should show error when workflow selector has archived workflow selected', async () => {
		const workflowId = faker.string.uuid();
		const modelValue: INodeParameterResourceLocator = {
			__rl: true,
			mode: 'id',
			value: workflowId,
		};

		workflowsStore.allWorkflows = [
			{
				id: workflowId,
				name: 'Test',
				active: false,
				isArchived: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				nodes: [],
				connections: {},
				versionId: faker.string.uuid(),
			},
		];

		const { emitted, container, getByTestId } = renderComponent({
			props: {
				path: 'columns',
				parameter: {
					displayName: 'Workflow',
					name: 'workflowId',
					type: 'workflowSelector',
					default: '',
				},
				modelValue,
			},
		});

		await waitFor(() => expect(getByTestId('resource-locator-workflowId')).toBeInTheDocument());

		expect(container.querySelector('.has-issues')).toBeInTheDocument();

		const inputs = container.querySelectorAll('input');
		const mode = inputs[0];
		expect(mode).toBeInTheDocument();
		expect(mode).toHaveValue('By ID');

		const value = inputs[1];
		expect(value).toBeInTheDocument();
		expect(value).toHaveValue(workflowId);

		expect(getByTestId('parameter-issues')).toBeInTheDocument();

		expect(emitted('update')).toBeUndefined();
	});

	test('should reset bool on eventBus:removeExpression', async () => {
		const eventBus = createEventBus();
		const { emitted } = renderComponent({
			props: {
				path: 'aSwitch',
				parameter: {
					displayName: 'A Switch',
					name: 'aSwitch',
					type: 'boolean',
					default: true,
				},
				modelValue: '={{ }}', // note that this makes a syntax error
				eventBus,
			},
		});

		eventBus.emit('optionSelected', 'removeExpression');
		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: true })]);
	});

	test('should reset bool with undefined evaluation on eventBus:removeExpression', async () => {
		const eventBus = createEventBus();
		const { emitted } = renderComponent({
			props: {
				path: 'aSwitch',
				parameter: {
					displayName: 'A Switch',
					name: 'aSwitch',
					type: 'boolean',
					default: true,
				},
				modelValue: undefined,
				eventBus,
			},
		});

		eventBus.emit('optionSelected', 'removeExpression');
		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: true })]);
	});

	test('should reset number on eventBus:removeExpression', async () => {
		const eventBus = createEventBus();
		const { emitted } = renderComponent({
			props: {
				path: 'aNum',
				parameter: {
					displayName: 'A Num',
					name: 'aNum',
					type: 'number',
					default: 6,
				},
				modelValue: '={{ }}', // note that this makes a syntax error
				eventBus,
			},
		});

		eventBus.emit('optionSelected', 'removeExpression');
		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: 6 })]);
	});

	test('should reset string on eventBus:removeExpression', async () => {
		const eventBus = createEventBus();
		const { emitted } = renderComponent({
			props: {
				path: 'aStr',
				parameter: {
					displayName: 'A Str',
					name: 'aStr',
					type: 'string',
					default: 'some default',
				},
				modelValue: '={{ }}', // note that this makes a syntax error
				eventBus,
			},
		});

		eventBus.emit('optionSelected', 'removeExpression');
		expect(emitted('update')).toContainEqual([expect.objectContaining({ value: '{{ }}' })]);
	});
});
