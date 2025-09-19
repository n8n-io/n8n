import { createComponentRenderer } from '@/__tests__/render';
import { useNDVStore } from '@/stores/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, within } from '@testing-library/vue';
import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import AssignmentCollection from './AssignmentCollection.vue';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
		},
		stubActions: false,
	}),
	props: {
		path: 'parameters.fields',
		node: {
			parameters: {},
			id: 'f63efb2d-3cc5-4500-89f9-b39aab19baf5',
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.3,
			position: [1120, 380],
			credentials: {},
			disabled: false,
		},
		parameter: { name: 'fields', displayName: 'Fields To Set' },
		value: {},
	},
};

const renderComponent = createComponentRenderer(AssignmentCollection, DEFAULT_SETUP);

const getInput = (e: HTMLElement): HTMLInputElement => {
	return e.querySelector('input') as HTMLInputElement;
};

const getAssignmentType = (assignment: HTMLElement): string => {
	return getInput(within(assignment).getByTestId('assignment-type-select')).value;
};

async function dropAssignment({
	key,
	value,
	dropArea,
}: {
	key: string;
	value: unknown;
	dropArea: HTMLElement;
}): Promise<void> {
	useNDVStore().draggableStartDragging({
		type: 'mapping',
		data: `{{ $json.${key} }}`,
		dimensions: null,
	});

	vitest.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(value as never);

	await userEvent.hover(dropArea);
	await fireEvent.mouseUp(dropArea);
}

describe('AssignmentCollection.vue', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders empty state properly', async () => {
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('assignment-collection-fields')).toBeInTheDocument();
		expect(getByTestId('assignment-collection-fields')).toHaveClass('empty');
		expect(getByTestId('assignment-collection-drop-area')).toHaveTextContent(
			'Drag input fields here',
		);
		expect(queryByTestId('assignment')).not.toBeInTheDocument();
	});

	it('can add and remove assignments', async () => {
		const { getByTestId, findAllByTestId } = renderComponent();

		await userEvent.click(getByTestId('assignment-collection-drop-area'));
		await userEvent.click(getByTestId('assignment-collection-drop-area'));

		let assignments = await findAllByTestId('assignment');

		expect(assignments.length).toEqual(2);

		await userEvent.type(getInput(within(assignments[1]).getByTestId('assignment-name')), 'second');
		await userEvent.type(
			getInput(within(assignments[1]).getByTestId('assignment-value')),
			'secondValue',
		);
		await userEvent.click(within(assignments[0]).getByTestId('assignment-remove'));

		assignments = await findAllByTestId('assignment');
		expect(assignments.length).toEqual(1);
		expect(getInput(within(assignments[0]).getByTestId('assignment-value'))).toHaveValue(
			'secondValue',
		);
	});

	it('does not break with saved assignments that have no ID (legacy)', async () => {
		const { findAllByTestId } = renderComponent({
			props: {
				value: {
					assignments: [
						{ name: 'key1', value: 'value1', type: 'string' },
						{ name: 'key2', value: 'value2', type: 'string' },
						{ name: 'key3', value: 'value3', type: 'string' },
					],
				},
			},
		});

		let assignments = await findAllByTestId('assignment');

		expect(assignments.length).toEqual(3);

		// Remove 2nd assignment
		await userEvent.click(within(assignments[1]).getByTestId('assignment-remove'));
		assignments = await findAllByTestId('assignment');
		expect(assignments.length).toEqual(2);
		expect(getInput(within(assignments[0]).getByTestId('assignment-value'))).toHaveValue('value1');
		expect(getInput(within(assignments[1]).getByTestId('assignment-value'))).toHaveValue('value3');
	});

	it('can add assignments by drag and drop (and infer type)', async () => {
		const { getByTestId, findAllByTestId } = renderComponent();
		const dropArea = getByTestId('drop-area');

		await dropAssignment({ key: 'boolKey', value: true, dropArea });
		await dropAssignment({ key: 'stringKey', value: 'stringValue', dropArea });
		await dropAssignment({ key: 'numberKey', value: 25, dropArea });
		await dropAssignment({ key: 'objectKey', value: {}, dropArea });
		await dropAssignment({ key: 'arrayKey', value: [], dropArea });

		const assignments = await findAllByTestId('assignment');

		expect(assignments.length).toBe(5);
		expect(getAssignmentType(assignments[0])).toEqual('Boolean');
		expect(getAssignmentType(assignments[1])).toEqual('String');
		expect(getAssignmentType(assignments[2])).toEqual('Number');
		expect(getAssignmentType(assignments[3])).toEqual('Object');
		expect(getAssignmentType(assignments[4])).toEqual('Array');
	});

	describe('defaultType prop', () => {
		it('should use string as default type when no defaultType is specified', async () => {
			const { getByTestId, findAllByTestId } = renderComponent();

			await userEvent.click(getByTestId('assignment-collection-drop-area'));

			const assignments = await findAllByTestId('assignment');
			expect(assignments.length).toBe(1);
			expect(getAssignmentType(assignments[0])).toEqual('String');
		});

		it('should use specified defaultType when adding a new assignment manually', async () => {
			const { getByTestId, findAllByTestId } = renderComponent({
				props: {
					defaultType: 'number',
				},
			});

			await userEvent.click(getByTestId('assignment-collection-drop-area'));

			const assignments = await findAllByTestId('assignment');
			expect(assignments.length).toBe(1);
			expect(getAssignmentType(assignments[0])).toEqual('Number');
		});

		it('should use defaultType for drag and drop when disableType is true', async () => {
			const { getByTestId, findAllByTestId } = renderComponent({
				props: {
					defaultType: 'number',
					disableType: true,
				},
			});

			const dropArea = getByTestId('drop-area');

			// Even though we're dropping a string value, it should use number type because of defaultType
			await dropAssignment({ key: 'stringKey', value: 'stringValue', dropArea });

			const assignments = await findAllByTestId('assignment');
			expect(assignments.length).toBe(1);
			expect(getAssignmentType(assignments[0])).toEqual('Number');
		});

		it('should respect defaultType for all assignments when provided', async () => {
			const { getByTestId, findAllByTestId } = renderComponent({
				props: {
					defaultType: 'boolean',
				},
			});

			const dropArea = getByTestId('drop-area');

			await userEvent.click(getByTestId('assignment-collection-drop-area'));

			await dropAssignment({ key: 'stringKey', value: 'stringValue', dropArea });
			await dropAssignment({ key: 'numberKey', value: 25, dropArea });

			const assignments = await findAllByTestId('assignment');
			expect(assignments.length).toBe(3);
			expect(getAssignmentType(assignments[0])).toEqual('Boolean');
			expect(getAssignmentType(assignments[1])).toEqual('Boolean');
			expect(getAssignmentType(assignments[2])).toEqual('Boolean');
		});
	});
});
