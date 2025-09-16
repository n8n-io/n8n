import type { FieldTypeMap } from 'n8n-workflow';

export type DataStoreUserTableName = `${string}data_table_user_${string}`;

export type DataTablesSizeData = {
	totalBytes: number;
	dataTables: Record<string, number>;
};

export const columnTypeToFieldType: Record<string, keyof FieldTypeMap> = {
	// eslint-disable-next-line id-denylist
	number: 'number',
	// eslint-disable-next-line id-denylist
	string: 'string',
	// eslint-disable-next-line id-denylist
	boolean: 'boolean',
	date: 'dateTime',
};
