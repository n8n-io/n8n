import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type {
	AGGridCellType,
	DataStoreColumnType,
	DataStoreValue,
} from '@/features/dataStore/datastore.types';
import { isAGGridCellType } from '@/features/dataStore/typeGuards';
import { ResponseError } from '@n8n/rest-api-client';
import { useI18n } from '@n8n/i18n';

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
	const i18n = useI18n();

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

	const getAddColumnError = (error: unknown): { httpStatus: number; message: string } => {
		const DEFAULT_HTTP_STATUS = 500;
		const DEFAULT_MESSAGE = i18n.baseText('generic.unknownError');

		if (error instanceof ResponseError) {
			return {
				httpStatus: error.httpStatusCode ?? 500,
				message: error.message,
			};
		}
		if (error instanceof Error) {
			return {
				httpStatus: DEFAULT_HTTP_STATUS,
				message: error.message,
			};
		}
		return {
			httpStatus: DEFAULT_HTTP_STATUS,
			message: DEFAULT_MESSAGE,
		};
	};

	return {
		getIconForType,
		mapToAGCellType,
		mapToDataStoreColumnType,
		getDefaultValueForType,
		getAddColumnError,
	};
};
