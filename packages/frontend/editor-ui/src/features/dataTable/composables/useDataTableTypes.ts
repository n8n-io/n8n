import type {
	AGGridCellType,
	DataTableColumnType,
	DataTableValue,
} from '@/features/dataTable/dataTable.types';
import { isAGGridCellType } from '@/features/dataTable/typeGuards';
import { ResponseError } from '@n8n/rest-api-client';
import { useI18n } from '@n8n/i18n';
import { DATA_TYPE_ICON_MAP } from '@/constants';

export const useDataTableTypes = () => {
	const getIconForType = (type: DataTableColumnType) => DATA_TYPE_ICON_MAP[type];
	const i18n = useI18n();

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

	const mapToDataTableColumnType = (colType: AGGridCellType): DataTableColumnType => {
		if (!isAGGridCellType(colType)) {
			return 'string';
		}
		if (colType === 'text') {
			return 'string';
		}
		return colType as DataTableColumnType;
	};

	const getDefaultValueForType = (colType: DataTableColumnType): DataTableValue => {
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
		mapToDataTableColumnType,
		getDefaultValueForType,
		getAddColumnError,
	};
};
