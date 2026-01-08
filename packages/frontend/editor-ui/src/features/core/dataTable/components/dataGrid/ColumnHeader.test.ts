import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ColumnHeader, {
	type HeaderParamsWithDelete,
} from '@/features/core/dataTable/components/dataGrid/ColumnHeader.vue';

// Mock N8nActionDropdown to make it easy to trigger item selection
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: {
				items: { type: Array, required: true },
			},
			emits: ['select'],
			template: `
        <div>
          <ul>
            <li v-for="item in items" :key="item.id">
              <button :data-test-id="'action-' + item.id" @click="$emit('select', item.id)">
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
      `,
		},
	};
});

const onDeleteMock = vi.fn();

const renderComponent = createComponentRenderer(ColumnHeader, {
	props: {
		params: {
			displayName: 'My Column',
			column: {
				getColId: () => 'col-1',
				getColDef: () => ({ cellDataType: 'string' }),
				getSort: () => null,
			},
			onDelete: onDeleteMock,
			allowMenuActions: true,
			api: {
				getFilterModel: vi.fn().mockReturnValue({}),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			},
		} as unknown as HeaderParamsWithDelete,
	},
});

describe('ColumnHeader', () => {
	it('renders the column display name', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('data-table-column-header-text')).toHaveTextContent('My Column');
	});

	it('shows actions dropdown only on hover', async () => {
		const { getByTestId } = renderComponent();
		const wrapper = getByTestId('data-table-column-header');
		expect(wrapper).not.toBeNull();

		const deleteButton = getByTestId('action-delete');
		expect(deleteButton).not.toBeVisible();

		await fireEvent.mouseEnter(wrapper as Element);
		expect(deleteButton).toBeVisible();

		await fireEvent.mouseLeave(wrapper as Element);
		expect(deleteButton).not.toBeVisible();
	});

	it('calls onDelete with the column id when delete is selected', async () => {
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('action-delete'));
		expect(onDeleteMock).toHaveBeenCalledWith('col-1');
	});

	describe('onNameSubmit', () => {
		it('should call onRename when valid new name is provided', async () => {
			const onRenameMock = vi.fn();
			const { container } = renderComponent({
				props: {
					params: {
						displayName: 'Original Name',
						column: {
							getColId: () => 'col-1',
							getColDef: () => ({ cellDataType: 'string' }),
							getSort: () => null,
						},
						onRename: onRenameMock,
						onDelete: onDeleteMock,
						allowMenuActions: true,
						api: {
							getFilterModel: vi.fn().mockReturnValue({}),
							addEventListener: vi.fn(),
							removeEventListener: vi.fn(),
						},
					} as unknown as HeaderParamsWithDelete,
				},
			});

			// Find the actual input element within N8nInlineTextEdit
			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeTruthy();

			await userEvent.clear(input);
			await userEvent.type(input, 'New Name{Enter}');

			expect(onRenameMock).toHaveBeenCalledWith('col-1', 'New Name');
		});

		it('should trim whitespace before calling onRename', async () => {
			const onRenameMock = vi.fn();
			const { container } = renderComponent({
				props: {
					params: {
						displayName: 'Original Name',
						column: {
							getColId: () => 'col-1',
							getColDef: () => ({ cellDataType: 'string' }),
							getSort: () => null,
						},
						onRename: onRenameMock,
						onDelete: onDeleteMock,
						allowMenuActions: true,
						api: {
							getFilterModel: vi.fn().mockReturnValue({}),
							addEventListener: vi.fn(),
							removeEventListener: vi.fn(),
						},
					} as unknown as HeaderParamsWithDelete,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeTruthy();

			await userEvent.clear(input);
			await userEvent.type(input, '  Trimmed Name  {Enter}');

			expect(onRenameMock).toHaveBeenCalledWith('col-1', 'Trimmed Name');
		});

		it('should not call onRename when name is empty', async () => {
			const onRenameMock = vi.fn();
			const { container } = renderComponent({
				props: {
					params: {
						displayName: 'Original Name',
						column: {
							getColId: () => 'col-1',
							getColDef: () => ({ cellDataType: 'string' }),
							getSort: () => null,
						},
						onRename: onRenameMock,
						onDelete: onDeleteMock,
						allowMenuActions: true,
						api: {
							getFilterModel: vi.fn().mockReturnValue({}),
							addEventListener: vi.fn(),
							removeEventListener: vi.fn(),
						},
					} as unknown as HeaderParamsWithDelete,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeTruthy();

			await userEvent.clear(input);
			await fireEvent.blur(input);

			expect(onRenameMock).not.toHaveBeenCalled();
		});

		it('should not call onRename when name is only whitespace', async () => {
			const onRenameMock = vi.fn();
			const { container } = renderComponent({
				props: {
					params: {
						displayName: 'Original Name',
						column: {
							getColId: () => 'col-1',
							getColDef: () => ({ cellDataType: 'string' }),
							getSort: () => null,
						},
						onRename: onRenameMock,
						onDelete: onDeleteMock,
						allowMenuActions: true,
						api: {
							getFilterModel: vi.fn().mockReturnValue({}),
							addEventListener: vi.fn(),
							removeEventListener: vi.fn(),
						},
					} as unknown as HeaderParamsWithDelete,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeTruthy();

			await userEvent.clear(input);
			await userEvent.type(input, '   ');
			await fireEvent.blur(input);

			expect(onRenameMock).not.toHaveBeenCalled();
		});

		it('should not call onRename when name is unchanged', async () => {
			const onRenameMock = vi.fn();
			const { container } = renderComponent({
				props: {
					params: {
						displayName: 'Original Name',
						column: {
							getColId: () => 'col-1',
							getColDef: () => ({ cellDataType: 'string' }),
							getSort: () => null,
						},
						onRename: onRenameMock,
						onDelete: onDeleteMock,
						allowMenuActions: true,
						api: {
							getFilterModel: vi.fn().mockReturnValue({}),
							addEventListener: vi.fn(),
							removeEventListener: vi.fn(),
						},
					} as unknown as HeaderParamsWithDelete,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeTruthy();

			await userEvent.clear(input);
			await userEvent.type(input, 'Original Name');
			await fireEvent.blur(input);

			expect(onRenameMock).not.toHaveBeenCalled();
		});

		it('should not call onRename when onRename callback is not provided', async () => {
			const { container } = renderComponent({
				props: {
					params: {
						displayName: 'Original Name',
						column: {
							getColId: () => 'col-1',
							getColDef: () => ({ cellDataType: 'string' }),
							getSort: () => null,
						},
						onDelete: onDeleteMock,
						allowMenuActions: true,
						api: {
							getFilterModel: vi.fn().mockReturnValue({}),
							addEventListener: vi.fn(),
							removeEventListener: vi.fn(),
						},
					} as unknown as HeaderParamsWithDelete,
				},
			});

			const input = container.querySelector('input') as HTMLInputElement;
			expect(input).toBeTruthy();

			await userEvent.clear(input);
			await userEvent.type(input, 'New Name');

			// Should not throw an error
			await expect(fireEvent.blur(input)).resolves.not.toThrow();
		});
	});
});
