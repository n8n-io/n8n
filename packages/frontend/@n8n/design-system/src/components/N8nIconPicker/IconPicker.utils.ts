import type { IconPickerVirtualRow } from './useIconPickerVirtualRows';

export type PickerCoordinate = {
	row: number;
	column: number;
};

export type PickerDirection = 'up' | 'down' | 'left' | 'right';

export function getPickerDirection(key: string): PickerDirection | undefined {
	if (key === 'ArrowUp') return 'up';
	if (key === 'ArrowDown') return 'down';
	if (key === 'ArrowLeft') return 'left';
	if (key === 'ArrowRight') return 'right';
	return undefined;
}

export function getPickerOptionId(coordinate: PickerCoordinate): string {
	return `icon-picker-option-${coordinate.row}-${coordinate.column}`;
}

export function isSamePickerCoordinate(
	left: PickerCoordinate | null,
	right: PickerCoordinate,
): boolean {
	return left?.row === right.row && left.column === right.column;
}

export function humanizeIconName(name: string): string {
	return name.replace(/-/g, ' ').replace(/\b\w/g, function capitalizeLetter(letter) {
		return letter.toUpperCase();
	});
}

export function getRowItemCount(row: IconPickerVirtualRow): number {
	if (row.type === 'icon-row') return row.iconNames.length;
	if (row.type === 'emoji-row') return row.emojis.length;
	return 0;
}

export function getPickerCoordinates(rows: IconPickerVirtualRow[]): PickerCoordinate[] {
	return rows.flatMap(function mapRowToCoordinates(row, rowIndex) {
		return Array.from({ length: getRowItemCount(row) }, function createCoordinate(_, column) {
			return { row: rowIndex, column };
		});
	});
}

function getVerticalCoordinate(
	rows: IconPickerVirtualRow[],
	current: PickerCoordinate,
	direction: -1 | 1,
): PickerCoordinate | undefined {
	for (
		let rowIndex = current.row + direction;
		rowIndex >= 0 && rowIndex < rows.length;
		rowIndex += direction
	) {
		const row = rows[rowIndex];
		if (!row) continue;

		const itemCount = getRowItemCount(row);
		if (itemCount > 0) {
			return { row: rowIndex, column: Math.min(current.column, itemCount - 1) };
		}
	}

	return undefined;
}

export function getAdjacentPickerCoordinate(
	rows: IconPickerVirtualRow[],
	current: PickerCoordinate,
	direction: PickerDirection,
): PickerCoordinate | undefined {
	if (direction === 'up' || direction === 'down') {
		return getVerticalCoordinate(rows, current, direction === 'up' ? -1 : 1);
	}

	const coordinates = getPickerCoordinates(rows);
	const currentIndex = coordinates.findIndex(function findCurrentCoordinate(coordinate) {
		return isSamePickerCoordinate(current, coordinate);
	});

	return coordinates[currentIndex + (direction === 'left' ? -1 : 1)];
}
