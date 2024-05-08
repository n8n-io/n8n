import { renderComponent } from '@/__tests__/render';
import ParameterInput from '@/components/ParameterInput.vue';
import type { useNDVStore } from '@/stores/ndv.store';
import type { CompletionResult } from '@codemirror/autocomplete';
import { createTestingPinia } from '@pinia/testing';
import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { useNodeTypesStore } from '../../stores/nodeTypes.store';

let mockNdvState: Partial<ReturnType<typeof useNDVStore>>;
let mockNodeTypesState: Partial<ReturnType<typeof useNodeTypesStore>>;
let mockCompletionResult: Partial<CompletionResult>;

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
		}),
		RouterLink: vi.fn(),
	};
});

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
		};
		mockNodeTypesState = {
			allNodeTypes: [],
		};
	});

	test('should render an options parameter (select)', async () => {
		const { container, baseElement, emitted } = renderComponent(ParameterInput, {
			pinia: createTestingPinia(),
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

	test('should render a string parameter', async () => {
		const { container, emitted } = renderComponent(ParameterInput, {
			pinia: createTestingPinia(),
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

	test('should not reset the value of a multi-select with loadOptionsMethod on load', async () => {
		mockNodeTypesState.getNodeParameterOptions = vi.fn(async () => [
			{ name: 'ID', value: 'id' },
			{ name: 'Title', value: 'title' },
			{ name: 'Description', value: 'description' },
		]);

		const { emitted, container } = renderComponent(ParameterInput, {
			pinia: createTestingPinia(),
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
});
