import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref, type Ref } from 'vue';
import { useAgGrid } from './useAgGrid';
import { useClipboard } from '@/composables/useClipboard';
import type {
	GridApi,
	GridReadyEvent,
	CellEditingStartedEvent,
	CellEditingStoppedEvent,
	CellKeyDownEvent,
	CellClickedEvent,
	SortChangedEvent,
	ColDef,
	Column,
	IRowNode,
} from 'ag-grid-community';

vi.mock('@/composables/useClipboard', () => ({
	useClipboard: vi.fn((options) => {
		return {
			copy: vi.fn(async (text: string) => text),
			onPaste: options?.onPaste || vi.fn(),
		};
	}),
}));

vi.mock('@vueuse/core', () => ({
	onClickOutside: vi.fn(),
}));

describe('useAgGrid', () => {
	let gridContainerRef: Ref<HTMLElement | null>;
	let mockGridApi: Partial<GridApi>;

	beforeEach(() => {
		gridContainerRef = ref(document.createElement('div'));
		mockGridApi = {
			setGridOption: vi.fn(),
			getFocusedCell: vi.fn(),
			getEditingCells: vi.fn(() => []),
			getDisplayedRowAtIndex: vi.fn(),
			getRowNode: vi.fn(),
			getAllDisplayedColumns: vi.fn(() => []),
			ensureIndexVisible: vi.fn(),
			setFocusedCell: vi.fn(),
			startEditingCell: vi.fn(),
			isEditing: vi.fn(() => false),
			clearFocusedCell: vi.fn(),
		};
	});

	const createComposable = (options?: Partial<Parameters<typeof useAgGrid>[0]>) => {
		return useAgGrid({
			gridContainerRef,
			defaultSortColumn: 'id',
			pinnedBottomRowId: '__add_row__',
			...options,
		});
	};

	describe('initialization', () => {
		it('should initialize with default values', () => {
			const { currentSortBy, currentSortOrder, isTextEditorOpen } = createComposable();

			expect(currentSortBy.value).toBe('id');
			expect(currentSortOrder.value).toBe('asc');
			expect(isTextEditorOpen.value).toBe(false);
		});

		it('should throw error when accessing gridApi before initialization', () => {
			const { gridApi } = createComposable();

			expect(() => gridApi.value).toThrow('Grid API is not initialized');
		});
	});

	describe('onGridReady', () => {
		it('should set grid API', () => {
			const { onGridReady, gridApi } = createComposable();
			const event = {
				api: mockGridApi as GridApi,
			} as GridReadyEvent;

			onGridReady(event);

			expect(() => gridApi.value).not.toThrow();
		});

		it('should set popup parent to grid container', () => {
			const { onGridReady } = createComposable();
			const event = {
				api: mockGridApi as GridApi,
			} as GridReadyEvent;

			onGridReady(event);

			expect(mockGridApi.setGridOption).toHaveBeenCalledWith('popupParent', gridContainerRef.value);
		});

		it('should set default column definition if provided', () => {
			const defaultColDef: ColDef = { sortable: true, filter: true };
			const { onGridReady } = createComposable({ defaultColDef });
			const event = {
				api: mockGridApi as GridApi,
			} as GridReadyEvent;

			onGridReady(event);

			expect(mockGridApi.setGridOption).toHaveBeenCalledWith('defaultColDef', defaultColDef);
		});
	});

	describe('setGridData', () => {
		it('should set column definitions', () => {
			const { onGridReady, setGridData } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const colDefs: ColDef[] = [{ field: 'name' }, { field: 'age' }];
			setGridData({ colDefs });

			expect(mockGridApi.setGridOption).toHaveBeenCalledWith('columnDefs', colDefs);
		});

		it('should set row data', () => {
			const { onGridReady, setGridData } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const rowData = [
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' },
			];
			setGridData({ rowData });

			expect(mockGridApi.setGridOption).toHaveBeenCalledWith('rowData', rowData);
		});

		it('should set pinned bottom row data', () => {
			const { onGridReady, setGridData } = createComposable({
				pinnedBottomRowId: '__add_row__',
			});
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			setGridData({ rowData: [] });

			expect(mockGridApi.setGridOption).toHaveBeenCalledWith('pinnedBottomRowData', [
				{ id: '__add_row__' },
			]);
		});

		it('should not set pinned row if pinnedBottomRowId is undefined', () => {
			const { onGridReady, setGridData } = createComposable({
				pinnedBottomRowId: undefined,
			});
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			setGridData({ rowData: [] });

			expect(mockGridApi.setGridOption).not.toHaveBeenCalledWith(
				'pinnedBottomRowData',
				expect.anything(),
			);
		});
	});

	describe('focusFirstEditableCell', () => {
		it('should focus and start editing first editable cell', () => {
			vi.useFakeTimers();
			const { onGridReady, focusFirstEditableCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockRowNode = { rowIndex: 0 } as IRowNode;
			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ editable: true }),
			} as unknown as Column;

			mockGridApi.getRowNode = vi.fn(() => mockRowNode);
			mockGridApi.getAllDisplayedColumns = vi.fn(() => [mockColumn]);

			focusFirstEditableCell(1);

			// Need to wait for requestAnimationFrame calls
			vi.runAllTimers();

			expect(mockGridApi.ensureIndexVisible).toHaveBeenCalledWith(0);
			expect(mockGridApi.setFocusedCell).toHaveBeenCalledWith(0, 'name');
			expect(mockGridApi.startEditingCell).toHaveBeenCalledWith({
				rowIndex: 0,
				colKey: 'name',
			});

			vi.useRealTimers();
		});

		it('should exclude specified column', () => {
			vi.useFakeTimers();
			const { onGridReady, focusFirstEditableCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockRowNode = { rowIndex: 0 } as IRowNode;
			const excludedColumn = {
				getColId: () => 'id',
				getColDef: () => ({ editable: true, colId: 'id' }),
			} as unknown as Column;
			const editableColumn = {
				getColId: () => 'name',
				getColDef: () => ({ editable: true, colId: 'name' }),
			} as unknown as Column;

			mockGridApi.getRowNode = vi.fn(() => mockRowNode);
			mockGridApi.getAllDisplayedColumns = vi.fn(() => [excludedColumn, editableColumn]);

			focusFirstEditableCell(1, 'id');

			vi.runAllTimers();

			expect(mockGridApi.setFocusedCell).toHaveBeenCalledWith(0, 'name');

			vi.useRealTimers();
		});

		it('should return early if row node not found', () => {
			const { onGridReady, focusFirstEditableCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			mockGridApi.getRowNode = vi.fn(() => undefined);

			focusFirstEditableCell(999);

			expect(mockGridApi.ensureIndexVisible).not.toHaveBeenCalled();
		});

		it('should return early if no editable column found', () => {
			vi.useFakeTimers();
			const { onGridReady, focusFirstEditableCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockRowNode = { rowIndex: 0 } as IRowNode;
			const nonEditableColumn = {
				getColId: () => 'id',
				getColDef: () => ({ editable: false }),
			} as unknown as Column;

			mockGridApi.getRowNode = vi.fn(() => mockRowNode);
			mockGridApi.getAllDisplayedColumns = vi.fn(() => [nonEditableColumn]);

			focusFirstEditableCell(1);

			vi.runAllTimers();

			expect(mockGridApi.startEditingCell).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});

	describe('onCellEditingStarted', () => {
		it('should set isTextEditorOpen to true for text cells', () => {
			const { onGridReady, onCellEditingStarted, isTextEditorOpen } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const event = {
				column: {
					getColDef: () => ({ cellDataType: 'text' }),
				},
			} as unknown as CellEditingStartedEvent;

			onCellEditingStarted(event);

			expect(isTextEditorOpen.value).toBe(true);
		});

		it('should set isTextEditorOpen to false for non-text cells', () => {
			const { onGridReady, onCellEditingStarted, isTextEditorOpen } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const event = {
				column: {
					getColDef: () => ({ cellDataType: 'number' }),
				},
			} as unknown as CellEditingStartedEvent;

			onCellEditingStarted(event);

			expect(isTextEditorOpen.value).toBe(false);
		});
	});

	describe('onCellEditingStopped', () => {
		it('should set isTextEditorOpen to false for text cells', () => {
			const { onGridReady, onCellEditingStopped, isTextEditorOpen } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			isTextEditorOpen.value = true;

			const event = {
				column: {
					getColDef: () => ({ cellDataType: 'text' }),
				},
			} as unknown as CellEditingStoppedEvent;

			onCellEditingStopped(event);

			expect(isTextEditorOpen.value).toBe(false);
		});
	});

	describe('handleCopyFocusedCell', () => {
		it('should copy cell value to clipboard', async () => {
			const mockCopy = vi.fn();
			vi.mocked(useClipboard).mockReturnValue({
				copy: mockCopy,
				onPaste: ref(null),
				copied: computed(() => false),
				isSupported: ref(true),
				text: computed(() => ''),
			});

			const { onGridReady, handleCopyFocusedCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColDef: () => ({ field: 'name' }),
			} as unknown as Column;

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getDisplayedRowAtIndex = vi.fn(
				() =>
					({
						data: { name: 'John Doe' },
					}) as unknown as IRowNode,
			);

			const event = {
				api: mockGridApi as GridApi,
			} as unknown as CellKeyDownEvent;

			await handleCopyFocusedCell(event);

			expect(mockCopy).toHaveBeenCalledWith('John Doe');
		});

		it('should copy empty string for null values', async () => {
			const mockCopy = vi.fn();
			vi.mocked(useClipboard).mockReturnValue({
				copy: mockCopy,
				onPaste: ref(null),
				copied: computed(() => false),
				isSupported: ref(true),
				text: computed(() => ''),
			});

			const { onGridReady, handleCopyFocusedCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColDef: () => ({ field: 'name' }),
			} as unknown as Column;

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getDisplayedRowAtIndex = vi.fn(
				() =>
					({
						data: { name: null },
					}) as unknown as IRowNode,
			);

			const event = {
				api: mockGridApi as GridApi,
			} as unknown as CellKeyDownEvent;

			await handleCopyFocusedCell(event);

			expect(mockCopy).toHaveBeenCalledWith('');
		});

		it('should not copy if no cell is focused', async () => {
			const mockCopy = vi.fn();
			vi.mocked(useClipboard).mockReturnValue({
				copy: mockCopy,
				onPaste: ref(null),
				copied: computed(() => false),
				isSupported: ref(true),
				text: computed(() => ''),
			});

			const { onGridReady, handleCopyFocusedCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			mockGridApi.getFocusedCell = vi.fn(() => null);

			const event = {
				api: mockGridApi as GridApi,
			} as unknown as CellKeyDownEvent;

			await handleCopyFocusedCell(event);

			expect(mockCopy).not.toHaveBeenCalled();
		});
	});

	describe('onClipboardPaste', () => {
		it('should paste text data to text cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ cellDataType: 'text' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('Hello World');

			expect(mockRow.setDataValue).toHaveBeenCalledWith('name', 'Hello World');
		});

		it('should paste valid number to number cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'age',
				getColDef: () => ({ cellDataType: 'number' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('42');

			expect(mockRow.setDataValue).toHaveBeenCalledWith('age', 42);
		});

		it('should not paste invalid number to number cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'age',
				getColDef: () => ({ cellDataType: 'number' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('not a number');

			expect(mockRow.setDataValue).not.toHaveBeenCalled();
		});

		it('should paste valid date to date cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'createdAt',
				getColDef: () => ({ cellDataType: 'date' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('2024-01-15');

			expect(mockRow.setDataValue).toHaveBeenCalledWith('createdAt', new Date('2024-01-15'));
		});

		it('should not paste invalid date to date cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'createdAt',
				getColDef: () => ({ cellDataType: 'date' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('not a date');

			expect(mockRow.setDataValue).not.toHaveBeenCalled();
		});

		it('should paste true to boolean cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'active',
				getColDef: () => ({ cellDataType: 'boolean' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('true');

			expect(mockRow.setDataValue).toHaveBeenCalledWith('active', true);
		});

		it('should paste false to boolean cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'active',
				getColDef: () => ({ cellDataType: 'boolean' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('false');

			expect(mockRow.setDataValue).toHaveBeenCalledWith('active', false);
		});

		it('should not paste invalid boolean to boolean cell', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'active',
				getColDef: () => ({ cellDataType: 'boolean' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('yes');

			expect(mockRow.setDataValue).not.toHaveBeenCalled();
		});

		it('should not paste when no cell is focused', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => null);
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('some data');

			expect(mockRow.setDataValue).not.toHaveBeenCalled();
		});

		it('should not paste when cell is being edited', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ cellDataType: 'text' }),
			} as unknown as Column;

			const mockRow = {
				setDataValue: vi.fn(),
			};

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => [{ rowIndex: 0, colId: 'name', rowPinned: null }]);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => mockRow as unknown as IRowNode);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('some data');

			expect(mockRow.setDataValue).not.toHaveBeenCalled();
		});

		it('should not paste when row is not found', () => {
			const { onGridReady } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ cellDataType: 'text' }),
			} as unknown as Column;

			mockGridApi.getFocusedCell = vi.fn(() => ({
				rowIndex: 0,
				column: mockColumn,
				rowPinned: null,
			}));
			mockGridApi.getEditingCells = vi.fn(() => []);
			mockGridApi.getDisplayedRowAtIndex = vi.fn(() => undefined);

			const mockUseClipboard = vi.mocked(useClipboard);
			const onPasteCallback =
				mockUseClipboard.mock.calls[mockUseClipboard.mock.calls.length - 1]?.[0]?.onPaste;
			onPasteCallback?.('some data');

			// No assertion needed, just ensuring no error is thrown
		});
	});

	describe('onCellClicked', () => {
		it('should start editing on second click of same cell', () => {
			const { onGridReady, onCellClicked } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ editable: true }),
			} as unknown as Column;

			const click = {
				api: mockGridApi as GridApi,
				column: mockColumn,
				rowIndex: 0,
			} as unknown as CellClickedEvent;

			onCellClicked(click);
			expect(mockGridApi.startEditingCell).not.toHaveBeenCalled();

			onCellClicked(click);
			expect(mockGridApi.startEditingCell).toHaveBeenCalledWith({
				rowIndex: 0,
				colKey: 'name',
			});
		});

		it('should not start editing if cell is not editable', () => {
			const { onGridReady, onCellClicked } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'id',
				getColDef: () => ({ editable: false }),
			} as unknown as Column;

			const event = {
				api: mockGridApi as GridApi,
				column: mockColumn,
				rowIndex: 0,
			} as unknown as CellClickedEvent;

			onCellClicked(event);
			onCellClicked(event);

			expect(mockGridApi.startEditingCell).not.toHaveBeenCalled();
		});

		it('should not start editing if cell is already being edited', () => {
			const { onGridReady, onCellClicked } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			mockGridApi.isEditing = vi.fn(() => true);

			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ editable: true }),
			} as unknown as Column;

			const event = {
				api: mockGridApi as GridApi,
				column: mockColumn,
				rowIndex: 0,
			} as unknown as CellClickedEvent;

			onCellClicked(event);

			expect(mockGridApi.startEditingCell).not.toHaveBeenCalled();
		});
	});

	describe('resetLastFocusedCell', () => {
		it('should clear last focused cell', () => {
			const { onGridReady, onCellClicked, resetLastFocusedCell } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'name',
				getColDef: () => ({ editable: true }),
			} as unknown as Column;

			const event = {
				api: mockGridApi as GridApi,
				column: mockColumn,
				rowIndex: 0,
			} as unknown as CellClickedEvent;

			onCellClicked(event);
			resetLastFocusedCell();
			onCellClicked(event);

			expect(mockGridApi.startEditingCell).not.toHaveBeenCalled();
		});
	});

	describe('onSortChanged', () => {
		it('should update sort state when column is sorted', () => {
			const { onGridReady, onSortChanged, currentSortBy, currentSortOrder } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'col1',
				getSort: () => 'desc' as const,
			} as unknown as Column;

			const colDefs: ColDef[] = [{ colId: 'col1', field: 'name' }];

			const event = {
				columns: [mockColumn],
			} as unknown as SortChangedEvent;

			onSortChanged(event, colDefs);

			expect(currentSortBy.value).toBe('name');
			expect(currentSortOrder.value).toBe('desc');
		});

		it('should use colId if field is not defined', () => {
			const { onGridReady, onSortChanged, currentSortBy } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'col1',
				getSort: () => 'asc' as const,
			} as unknown as Column;

			const colDefs: ColDef[] = [{ colId: 'col1' }];

			const event = {
				columns: [mockColumn],
			} as unknown as SortChangedEvent;

			onSortChanged(event, colDefs);

			expect(currentSortBy.value).toBe('col1');
		});

		it('should reset to default sort when no column is sorted', () => {
			const { onGridReady, onSortChanged, currentSortBy, currentSortOrder } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const event = {
				columns: [],
			} as unknown as SortChangedEvent;

			onSortChanged(event, []);

			expect(currentSortBy.value).toBe('id');
			expect(currentSortOrder.value).toBe('asc');
		});
	});
});
