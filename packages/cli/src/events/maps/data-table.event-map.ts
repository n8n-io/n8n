import type { DataTableRowReturn } from 'n8n-workflow';

export type DataTableEventPayload = {
	dataTableId: string;
	operation: string;
	rows: DataTableRowReturn[];
};

export type DataTableEventMap = {
	'data-table-rows-added': DataTableEventPayload;
	'data-table-rows-modified': DataTableEventPayload;
	'data-table-rows-deleted': DataTableEventPayload;
};
