import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { AGGridCellType, DataStoreColumnType } from '@/features/dataStore/datastore.types';

/* eslint-disable id-denylist */
const COLUMN_TYPE_ICONS: Record<DataStoreColumnType, IconName> = {
	string: 'type',
	number: 'hash',
	boolean: 'toggle-right',
	date: 'calendar',
} as const;
/* eslint-enable id-denylist */

export const useDataStoreTypes = () => {
	const getIconForType = (type: DataStoreColumnType) => COLUMN_TYPE_ICONS[type];

	/**
	 * Maps a DataStoreColumnType to an AGGridCellType.
	 * For now the only mismatch is our 'string' type,
	 * which needs to be mapped manually.
	 * @param colType The DataStoreColumnType to map.
	 * @returns The corresponding AGGridCellType.
	 */
	const mapToAGCellType = (colType: DataStoreColumnType): AGGridCellType => {
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
