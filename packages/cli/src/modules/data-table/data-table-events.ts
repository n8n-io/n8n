import '@n8n/backend-services';

export interface DataTableEventMap {
	'data-table-deleted': { dataTableId: string; projectId: string };
	'data-table-storage-limit-reached': { totalBytes: number; maxBytes: number };
}

declare module '@n8n/backend-services' {
	interface EventMap extends DataTableEventMap {}
}
