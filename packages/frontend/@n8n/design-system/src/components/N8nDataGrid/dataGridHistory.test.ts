import type { DataGridCellEdit } from './DataGrid.types';
import { createDataGridHistory } from './dataGridHistory';

const edit = (rowKey: string, oldValue: unknown, newValue: unknown): DataGridCellEdit => ({
	rowKey,
	field: 'name',
	oldValue,
	newValue,
});

const createCells = (initial: Record<string, unknown>) => {
	const cells = new Map(Object.entries(initial));
	return {
		isChange: (change: DataGridCellEdit) =>
			cells.has(change.rowKey) && cells.get(change.rowKey) !== change.newValue,
		apply: (change: DataGridCellEdit | undefined) => {
			if (change) cells.set(change.rowKey, change.newValue);
		},
		deleteRow: (rowKey: string) => cells.delete(rowKey),
	};
};

const commit = (
	cells: ReturnType<typeof createCells>,
	history: ReturnType<typeof createDataGridHistory>,
	...changes: DataGridCellEdit[]
) => {
	for (const change of changes) {
		cells.apply(change);
		history.record(change);
	}
};

describe('createDataGridHistory', () => {
	it('should return undefined when there is nothing to undo or redo', () => {
		const cells = createCells({});
		const history = createDataGridHistory({ isChange: cells.isChange });

		expect(history.undo()).toBeUndefined();
		expect(history.redo()).toBeUndefined();
	});

	it('should return the reversed edit on undo and the original edit on redo', () => {
		const cells = createCells({ 1: 'a' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'));

		const undone = history.undo();
		expect(undone).toEqual(edit('1', 'b', 'a'));
		cells.apply(undone);

		const redone = history.redo();
		expect(redone).toEqual(edit('1', 'a', 'b'));
	});

	it('should undo edits in reverse order', () => {
		const cells = createCells({ 1: 'a', 2: 'c' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'), edit('2', 'c', 'd'));

		expect(history.undo()).toEqual(edit('2', 'd', 'c'));
		expect(history.undo()).toEqual(edit('1', 'b', 'a'));
		expect(history.undo()).toBeUndefined();
	});

	it('should clear the redo stack when a new edit is recorded', () => {
		const cells = createCells({ 1: 'a', 2: 'c' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'));
		cells.apply(history.undo());

		commit(cells, history, edit('2', 'c', 'd'));

		expect(history.redo()).toBeUndefined();
	});

	it('should skip a rejected edit and undo the previous edit in the same call', () => {
		const cells = createCells({ 1: 'a', 2: 'c' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'));
		history.record(edit('2', 'c', 'd'));

		expect(history.undo()).toEqual(edit('1', 'b', 'a'));
		expect(history.undo()).toBeUndefined();
	});

	it('should remove a rejected edit from the history', () => {
		const cells = createCells({ 1: 'a' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		history.record(edit('1', 'a', 'b'));

		expect(history.undo()).toBeUndefined();
		expect(history.redo()).toBeUndefined();
	});

	it('should skip a redo entry when the cell already shows its value', () => {
		const cells = createCells({ 1: 'a' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'));
		history.undo();

		expect(history.redo()).toBeUndefined();
	});

	it('should skip edits of rows that no longer exist', () => {
		const cells = createCells({ 1: 'a', 2: 'c' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'), edit('2', 'c', 'd'));

		cells.deleteRow('2');
		expect(history.undo()).toEqual(edit('1', 'b', 'a'));
		expect(history.undo()).toBeUndefined();
	});

	it('should drop the oldest edit when the limit is exceeded', () => {
		const cells = createCells({ 1: 'a', 2: 'c', 3: 'e' });
		const history = createDataGridHistory({ isChange: cells.isChange, limit: 2 });
		commit(cells, history, edit('1', 'a', 'b'), edit('2', 'c', 'd'), edit('3', 'e', 'f'));

		expect(history.undo()).toEqual(edit('3', 'f', 'e'));
		expect(history.undo()).toEqual(edit('2', 'd', 'c'));
		expect(history.undo()).toBeUndefined();
	});

	it('should forget all edits on clear', () => {
		const cells = createCells({ 1: 'a', 2: 'c' });
		const history = createDataGridHistory({ isChange: cells.isChange });
		commit(cells, history, edit('1', 'a', 'b'), edit('2', 'c', 'd'));
		cells.apply(history.undo());
		history.clear();

		expect(history.undo()).toBeUndefined();
		expect(history.redo()).toBeUndefined();
	});
});
