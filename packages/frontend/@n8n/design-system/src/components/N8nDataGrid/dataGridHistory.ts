import type { DataGridCellEdit } from './DataGrid.types';

const DEFAULT_HISTORY_LIMIT = 10;

const reverse = (edit: DataGridCellEdit): DataGridCellEdit => ({
	...edit,
	oldValue: edit.newValue,
	newValue: edit.oldValue,
});

export const createDataGridHistory = ({
	isChange,
	limit = DEFAULT_HISTORY_LIMIT,
}: {
	isChange: (edit: DataGridCellEdit) => boolean;
	limit?: number;
}) => {
	const undoStack: DataGridCellEdit[] = [];
	const redoStack: DataGridCellEdit[] = [];

	const move = (
		from: DataGridCellEdit[],
		to: DataGridCellEdit[],
		toEmitted: (edit: DataGridCellEdit) => DataGridCellEdit,
	) => {
		for (let edit = from.pop(); edit; edit = from.pop()) {
			const emitted = toEmitted(edit);
			if (isChange(emitted)) {
				to.push(edit);
				return emitted;
			}
		}
		return undefined;
	};

	const record = (edit: DataGridCellEdit) => {
		undoStack.push(edit);
		if (undoStack.length > limit) {
			undoStack.shift();
		}
		redoStack.length = 0;
	};

	const undo = (): DataGridCellEdit | undefined => move(undoStack, redoStack, reverse);

	const redo = (): DataGridCellEdit | undefined => move(redoStack, undoStack, (edit) => edit);

	const clear = () => {
		undoStack.length = 0;
		redoStack.length = 0;
	};

	return { record, undo, redo, clear };
};
