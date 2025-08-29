import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type {
	AGGridCellType,
	DataStoreColumnType,
	DataStoreValue,
} from '@/features/dataStore/datastore.types';
import { isAGGridCellType } from '@/features/dataStore/typeGuards';

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

	const mapToDataStoreColumnType = (colType: AGGridCellType): DataStoreColumnType => {
		if (!isAGGridCellType(colType)) {
			return 'string';
		}
		if (colType === 'text') {
			return 'string';
		}
		return colType as DataStoreColumnType;
	};

	const getDefaultValueForType = (colType: DataStoreColumnType): DataStoreValue => {
		switch (colType) {
			case 'string':
				return '';
			case 'number':
				return 0;
			case 'boolean':
				return false;
			case 'date':
				return null;
			default:
				return null;
		}
	};

	return {
		getIconForType,
		mapToAGCellType,
		mapToDataStoreColumnType,
		getDefaultValueForType,
	};
};
