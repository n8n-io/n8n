import type {
	AGGridCellType,
	DataTableColumnType,
} from '@/features/core/dataTable/dataTable.types';
import { DATA_TYPE_ICON_MAP } from '@/app/constants';

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
		}
		return colType;
	};

	return {
		getIconForType,
		mapToAGCellType,
	};
};
