import type { AGGridCellType, DataTableColumnType } from '@/features/dataTable/dataTable.types';
import { isAGGridCellType } from '@/features/dataTable/typeGuards';
import { DATA_TYPE_ICON_MAP } from '@/constants';

export const useDataTableTypes = () => {
	const getIconForType = (type: DataTableColumnType) => DATA_TYPE_ICON_MAP[type];

	/**
	 * Maps a DataTableColumnType to an AGGridCellType.
	 * For now the only mismatch is our 'string' type,
	 * which needs to be mapped manually.
	 * @param colType The DataTableColumnType to map.
	 * @returns The corresponding AGGridCellType.
	 */
	const mapToAGCellType = (colType: DataTableColumnType): AGGridCellType => {
		if (colType === 'string') {
			return 'text';
		} else if (colType === 'json') {
			return 'object';
		}
		return colType;
	};

	const mapToDataTableColumnType = (colType: AGGridCellType): DataTableColumnType => {
		if (!isAGGridCellType(colType)) {
			return 'string';
		} else if (colType === 'text') {
			return 'string';
		} else if (colType === 'object') {
			return 'json';
		}

		return colType as DataTableColumnType;
	};

	return {
		getIconForType,
		mapToAGCellType,
		mapToDataTableColumnType,
	};
};
